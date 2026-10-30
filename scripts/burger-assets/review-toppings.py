"""Render the actual nine exported GLBs together for visual inspection."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/models/burger-pilot'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
names=['lettuce','tomato','bacon','cheddar','swiss','onion','pickle','sauce-house','sauce-smoky']
for i,name in enumerate(names):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'{name}.glb'))
    new=set(bpy.data.objects)-before
    dx=(i%3-1)*3.1; dy=(i//3-1)*2.9
    for obj in new:
        if obj.parent is None: obj.location.x+=dx; obj.location.y+=dy; obj.location.z+=.45
bpy.ops.mesh.primitive_plane_add(size=200)
ground=bpy.context.object; ground.location.z=-.02
mat=bpy.data.materials.new('Warm neutral studio'); mat.diffuse_color=(.81,.80,.77,1); ground.data.materials.append(mat)
for position,power,size in [((-4,-5,8),1500,6),((4,1,6),900,5)]:
    data=bpy.data.lights.new('Softbox','AREA'); data.energy=power; data.shape='DISK'; data.size=size
    obj=bpy.data.objects.new('Softbox',data); bpy.context.collection.objects.link(obj); obj.location=position
    obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Review camera'); cam=bpy.data.objects.new('Review camera',data); bpy.context.collection.objects.link(cam)
cam.location=(3,-7,12); cam.rotation_euler=(Vector((0,0,.3))-cam.location).to_track_quat('-Z','Y').to_euler(); data.type='ORTHO'; data.ortho_scale=10.8
scene=bpy.context.scene; scene.camera=cam; scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
scene.render.resolution_x=1200; scene.render.resolution_y=1200; scene.render.resolution_percentage=100
scene.world.color=(.3,.3,.3); scene.view_settings.view_transform='AgX'
scene.render.filepath=str(OUT/'toppings-review.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'.local-ai/toppings-review.blend'))
bpy.ops.render.render(write_still=True)
