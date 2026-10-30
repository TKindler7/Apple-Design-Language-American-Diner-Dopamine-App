"""Render the actual shipped ingredient GLBs for review, without a web browser.

Run with Blender --background --python this_file -- --mode stills|spin.
The same normalized widths and contact formula are used by burger-pilot-model.js.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "assets/models/burger-pilot"
OUTPUT = ROOT / "artifacts/burger-pilot"
PARSER = argparse.ArgumentParser()
PARSER.add_argument("--mode", choices=["stills", "spin"], default="stills")
PARSER.add_argument("--size", type=int, default=960)
PARSER.add_argument("--samples", type=int, default=48)
PARSER.add_argument("--variant", default="original")
ARGS = PARSER.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
MANIFEST = json.loads((MODELS / "manifest.json").read_text())
VARIANTS = {
    "original": ["bun-bottom", "sauce-house", "lettuce", "tomato", "patty", "cheddar", "pickle", "bun-top"],
    "no-cheese": ["bun-bottom", "sauce-house", "lettuce", "tomato", "patty", "pickle", "bun-top"],
    "simple": ["bun-bottom", "patty", "bun-top"],
    "fully-loaded": ["bun-bottom", "sauce-smoky", "lettuce", "tomato", "patty", "patty", "swiss", "pickle", "onion", "bacon", "bun-top"],
}


def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == "MESH" for corner in obj.bound_box]
    if not points:
        raise ValueError("Ingredient has no mesh")
    return Vector([min(p[i] for p in points) for i in range(3)]), Vector([max(p[i] for p in points) for i in range(3)])


def import_layer(key, support, parent):
    config = MANIFEST["ingredients"][key]
    path = MODELS / config["url"].removeprefix("./")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = list(set(bpy.data.objects) - before)
    wrapper = bpy.data.objects.new("ingredient_" + key, None)
    bpy.context.collection.objects.link(wrapper)
    for obj in objects:
        if obj.parent not in objects:
            world = obj.matrix_world.copy()
            obj.parent = wrapper
            obj.matrix_world = world
    rotation = config.get("rotation", [0, 0, 0])
    if any(rotation):
        # Current authored assets are upright; refuse a mismatched review scene.
        raise ValueError("Add a glTF-to-Blender Euler conversion before rendering rotated assets")
    bpy.context.view_layer.update()
    low, high = bounds(objects)
    factor = config["width"] / max(high.x - low.x, high.y - low.y)
    wrapper.scale = (factor,) * 3
    bpy.context.view_layer.update()
    low, high = bounds(objects)
    height = high.z - low.z
    bottom = config.get("contactBottom", 0)
    top = config.get("contactTop", height)
    offset = config.get("offset", [0, 0, 0])
    wrapper.location = (-(low.x + high.x) / 2 + offset[0], -(low.y + high.y) / 2 - offset[2], -low.z + support - bottom + offset[1])
    wrapper.parent = parent
    support += max(0, config.get("stackHeight", top - bottom) - config.get("overlap", 0))
    return support


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, location, energy, size, color=(1, 1, 1)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size, data.color = energy, "DISK", size, color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim(obj, (0, 0, .8))


def make_scene(variant):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES" if ARGS.mode == "stills" else "CYCLES"
    scene.cycles.samples = ARGS.samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.cycles.transparent_max_bounces = 6
    # Metal is available on the host; CPU remains a supported fallback.
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        gpu = [device for device in prefs.devices if device.type == "METAL"]
        for device in prefs.devices:
            device.use = device in gpu
        if gpu:
            scene.cycles.device = "GPU"
    except Exception:
        scene.cycles.device = "CPU"
    scene.render.resolution_x = scene.render.resolution_y = ARGS.size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("Neutral studio")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (.8, .82, .85, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .28
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0
    turntable = bpy.data.objects.new("Burger", None)
    bpy.context.collection.objects.link(turntable)
    support = 0
    for key in VARIANTS[variant]:
        support = import_layer(key, support, turntable)
    bpy.context.view_layer.update()
    low, high = bounds(list(turntable.children_recursive))
    target_z = (low.z + high.z) / 2
    # A neutral seamless background and soft contact shadow; no staging obscures food.
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.015))
    plane = bpy.context.object
    mat = bpy.data.materials.new("Warm white backdrop")
    mat.diffuse_color = (.89, .88, .86, 1)
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.89, .88, .86, 1)
    mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = .8
    plane.data.materials.append(mat)
    area("Large softbox", (-3.5, -4.5, 6), 450, 4.5)
    area("Soft fill", (4.5, -1.5, 3.2), 150, 3.5, (.9, .94, 1))
    area("Rear edge light", (1, 4, 4.8), 320, 3, (1, .94, .86))
    data = bpy.data.cameras.new("Review camera")
    camera = bpy.data.objects.new("Review camera", data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    data.lens = 57
    distance = max(5.6, (high.z - low.z) * 2.6)
    data.clip_end = 500
    camera.location = (distance * .18, -distance, target_z + distance * .34)
    aim(camera, (0, 0, target_z))
    return scene, turntable, camera, target_z


OUTPUT.mkdir(parents=True, exist_ok=True)
scene, burger, camera, target_z = make_scene(ARGS.variant)
if ARGS.mode == "spin":
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = 1, 120
    burger.rotation_euler.z = 0
    burger.keyframe_insert(data_path="rotation_euler", frame=1)
    burger.rotation_euler.z = math.tau
    burger.keyframe_insert(data_path="rotation_euler", frame=121)
    # Use linear rotation, so the turntable does not accelerate at the seam.
    action = burger.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:
                        key.interpolation = "LINEAR"
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.filepath = str(OUTPUT / f"{ARGS.variant}-rotation.mp4")
    bpy.ops.render.render(animation=True)
else:
    for name, angle in [("front", 0), ("side", math.pi / 2), ("back", math.pi)]:
        burger.rotation_euler.z = angle
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = str(OUTPUT / f"{ARGS.variant}-{name}.png")
        bpy.ops.render.render(write_still=True)
    burger.rotation_euler.z = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / f"{ARGS.variant}-review.blend"))
print("Actual GLB preview rendered:", ARGS.variant, ARGS.mode)
