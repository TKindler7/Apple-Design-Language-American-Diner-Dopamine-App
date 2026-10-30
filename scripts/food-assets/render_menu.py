"""Offline review of exported GLBs using the app's actual normalized placements.

First run node scripts/prepare-menu-review.js. Then Blender --background --python
scripts/food-assets/render_menu.py -- [--variant default] [--item item-id] [--angle 0].
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--variant', default='default')
parser.add_argument('--item', default='all')
parser.add_argument('--size', default=800, type=int)
parser.add_argument('--samples', default=32, type=int)
parser.add_argument('--angle', default=0, type=float)
parser.add_argument('--cpu', action='store_true', help='Use CPU when the local Metal driver is unavailable')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
review = json.loads((ROOT / '.local-ai/menu-review.json').read_text())
OUTPUT = ROOT / 'artifacts/menu-review'
OUTPUT.mkdir(parents=True, exist_ok=True)
C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def bounds(objects):
    corners = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == 'MESH' for corner in obj.bound_box]
    return Vector([min(p[i] for p in corners) for i in range(3)]), Vector([max(p[i] for p in corners) for i in range(3)])


def empty(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj


def rotation(values):
    matrix = Matrix.Identity(4)
    for axis, value in zip('XYZ', values):
        matrix = matrix @ Matrix.Rotation(value, 4, axis)
    return C @ matrix @ C.inverted()


def import_layer(layer, turntable):
    config = review['manifest']['ingredients'][layer['asset']]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/models' / config['url'].removeprefix('./')))
    objects = list(set(bpy.data.objects) - before)
    basis = empty(layer['id'] + '_basis')
    for obj in objects:
        if obj.parent not in objects:
            world = obj.matrix_world.copy()
            obj.parent = basis
            obj.matrix_world = world
    basis.rotation_euler = rotation(config.get('rotation', [0, 0, 0])).to_euler()
    bpy.context.view_layer.update()
    low, high = bounds(objects)
    basis.scale = (config['width'] / max(high.x - low.x, high.y - low.y),) * 3
    bpy.context.view_layer.update()
    low, high = bounds(objects)
    basis.location = (-(low.x + high.x) / 2, -(low.y + high.y) / 2, -low.z)
    instance = empty(layer['id'])
    basis.parent = instance
    x, y, z = layer['position']
    instance.location = (x, -z, y)
    instance.rotation_euler = rotation(layer['rotation']).to_euler()
    sx, sy, sz = layer['scale']
    instance.scale = (sx, sz, sy)
    instance.parent = turntable


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def area(name, location, energy, size):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy, light.shape, light.size = energy, 'DISK', size
    obj = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim(obj, (0, 0, .7))


def render(dish):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 8
    scene.cycles.transmission_bounces = 6
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for device in prefs.devices:
            device.use = device.type == 'METAL'
        scene.cycles.device = 'GPU' if not args.cpu and any(d.type == 'METAL' for d in prefs.devices) else 'CPU'
    except Exception:
        scene.cycles.device = 'CPU'
    scene.render.resolution_x = scene.render.resolution_y = args.size
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new('Soft studio')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.8, .82, .85, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .28
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    turntable = empty(dish['name'])
    for layer in dish['layers']:
        import_layer(layer, turntable)
    turntable.rotation_euler.z = math.radians(args.angle)
    bpy.context.view_layer.update()
    low, high = bounds(list(turntable.children_recursive))
    center = (low + high) / 2
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.018))
    plane = bpy.context.object
    mat = bpy.data.materials.new('Backdrop')
    mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.89, .88, .86, 1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .8
    plane.data.materials.append(mat)
    area('Key', (-3.5, -4.5, 6), 450, 4.5)
    area('Fill', (4.5, -1.5, 3.2), 150, 3.5)
    area('Rim', (1, 4, 4.8), 320, 3)
    camera = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera'))
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.data.lens = 57
    radius = max(high.x-low.x, high.y-low.y) / 2
    height = (high.z-low.z) / 2
    elevation = .35 if dish['category'] in ['burgers', 'drinks'] else .58
    distance = max(3.4, max((abs(y*math.cos(elevation)-z*math.sin(elevation))/.315 + y*math.sin(elevation)+z*math.cos(elevation)) for y in [-height,height] for z in [-radius,radius]), radius/.315 + radius) * 1.12
    camera.location = (center.x + distance*.12, center.y-distance*math.cos(elevation), center.z+distance*math.sin(elevation))
    aim(camera, center)
    filename = f"{dish['id']}-{dish['variant']}" + (f"-{args.angle:g}deg" if args.angle else '') + '.png'
    scene.render.filepath = str(OUTPUT / filename)
    bpy.ops.render.render(write_still=True)
    print('REVIEW_RENDER ' + filename, flush=True)


for dish in review['dishes']:
    if dish['variant'] == args.variant and (args.item == 'all' or dish['id'] in args.item.split(',')):
        render(dish)
