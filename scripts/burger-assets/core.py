"""Author original, closed burger core meshes with chat-created photographic maps.
Run with Blender --background --python scripts/burger-assets/core.py.
No external models, gated weights or paid APIs. Blender exports Y-up GLBs.
"""
from pathlib import Path
import bpy, math, random, json
from mathutils import Vector
from mathutils.noise import noise_vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/models/burger-pilot'
TEX = OUT / 'textures'
PREVIEW = ROOT / '.local-ai/previews'
PREVIEW.mkdir(parents=True, exist_ok=True)
random.seed(1472)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0
scene.render.resolution_percentage = 100


def photographic_material(name, file, roughness, strength):
    image = bpy.data.images.load(str(TEX / file), check_existing=True)
    # Production texture encoding only; original generated PNG is retained unchanged.
    packed = image
    _ = packed.pixels[0]
    packed.filepath_raw = str(TEX / (Path(file).stem + '.jpg'))
    packed.file_format = 'JPEG'; packed.save()
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    ns, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = ns.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['IOR'].default_value = 1.42
    bsdf.inputs['Specular IOR Level'].default_value = .27
    col = ns.new('ShaderNodeTexImage'); col.image = packed
    links.new(col.outputs['Color'], bsdf.inputs['Base Color'])
    # Bake the material's fine relief into a portable tangent-space normal map.
    bump = ns.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .40
    bump.inputs['Distance'].default_value = strength
    links.new(col.outputs['Color'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    bpy.ops.mesh.primitive_plane_add(size=2.4)
    plane = bpy.context.object; plane.data.materials.append(mat)
    target = bpy.data.images.new(name + '-normal', width=1024, height=1024, alpha=False)
    target.colorspace_settings.name = 'Non-Color'
    target.filepath_raw = str(TEX / (Path(file).stem.replace('albedo','normal') + '.png'))
    target.file_format = 'PNG'
    bake_node = ns.new('ShaderNodeTexImage'); bake_node.image = target
    ns.active = bake_node
    scene.render.bake.margin = 8
    scene.render.bake.use_selected_to_active = False
    bpy.ops.object.bake(type='NORMAL')
    target.save()
    bpy.data.objects.remove(plane, do_unlink=True)
    links.remove(bsdf.inputs['Normal'].links[0])
    ns.remove(bump)
    normal = ns.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value = .65
    links.new(bake_node.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    return mat, image

crust, crust_image = photographic_material('Brioche crust', 'core-brioche-albedo.png', .53, .007)
crumb, crumb_image = photographic_material('Soft cut bread', 'core-crumb-albedo.png', .86, .010)
beef, beef_image = photographic_material('Seared beef', 'core-beef-albedo.png', .56, .014)


def solid(name, color, rough=.6):
    mat = bpy.data.materials.new(name); mat.diffuse_color = (*color,1); mat.use_nodes = True
    b = mat.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value = (*color,1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = .24
    return mat
seeds_mat = [solid('Sesame ivory '+str(i), c, .65) for i,c in enumerate([(0.76,.57,.31),(.88,.71,.43),(.69,.48,.23)])]

# Blender stores loaded image pixels in scene-linear space; only geometry uses these values.
pixel_cache={}
def sample(image,u,v):
    if image.name not in pixel_cache:
        pixel_cache[image.name] = (image.size[0],image.size[1],list(image.pixels[:]))
    w,h,p=pixel_cache[image.name]
    x=int((u%1)*(w-1)); y=int((v%1)*(h-1)); i=4*(y*w+x)
    return .2126*p[i]+.7152*p[i+1]+.0722*p[i+2]

def n3(x,y,z,scale):
    return noise_vector(Vector((x*scale+3.1,y*scale-9.2,z*scale+1.7))).x


def lathe(name, profile, radius, materials, top_kind, segments=176):
    vertices=[]; faces=[]; face_uv=[]; mids=[]
    # profile = (normalized radius, height, material index, UV surface mode)
    for ri,(r,z,mi,mode) in enumerate(profile):
        for j in range(segments):
            t=2*math.pi*j/segments
            radial_variation = .008*math.sin(t*3+.4)+.004*math.sin(t*7+1.6)
            if top_kind=='beef': radial_variation += .022*math.sin(t*17+.1)+.014*math.sin(t*31)+.009*math.sin(t*43+.3)
            rr=radius*r*(1+radial_variation)
            x,y=rr*math.cos(t),rr*math.sin(t)
            if top_kind=='beef':
                coarse=n3(x,y,z,22)*.025+n3(x,y,z,57)*.010
                zz=z + coarse + .014*(sample(beef_image,.5+x/2.35,.5+y/2.35)-.20)
                x += .006*n3(x,y,z,39); y += .006*n3(y,x,z,43)
            else:
                zz=z + .004*n3(x,y,z,6)+.0018*n3(x,y,z,40)
                # Uneven proofing and a quiet ring of real baking wrinkles near the cut edge.
                if top_kind=='upper':
                    zz += .006*math.sin(27*t+.5)*max(0,r-.72)/.28
                if r<.08: zz=z
            vertices.append((x,y,zz))
    for k in range(len(profile)-1):
        mi=profile[k][2]; mode=profile[k][3]
        for j in range(segments):
            ids=(k*segments+j,(k+1)*segments+j,(k+1)*segments+(j+1)%segments,k*segments+(j+1)%segments)
            faces.append(ids); mids.append(mi)
            uvs=[]
            for corner,vi in enumerate(ids):
                x,y,z=vertices[vi]
                if mode=='side':
                    jj=j if corner in (0,1) else j+1
                    uvs.append((jj/segments*math.pi, z/(radius*2.0)+.23))
                else: uvs.append((.5+x/(radius*2.06),.5+y/(radius*2.06)))
            face_uv.append(uvs)
    # Close both tiny central rings, preserving closed geometry and complete hidden surfaces.
    faces.append(tuple(reversed(tuple(range(segments)))))
    mids.append(profile[0][2]); face_uv.append([(.5,.5)]*segments)
    end=(len(profile)-1)*segments
    faces.append(tuple(end+j for j in range(segments)))
    mids.append(profile[-1][2]); face_uv.append([(.5,.5)]*segments)
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    for mat in materials: mesh.materials.append(mat)
    uv=mesh.uv_layers.new(name='UVMap')
    for poly,coords,mi in zip(mesh.polygons,face_uv,mids):
        poly.material_index=mi; poly.use_smooth=True
        for li,coord in zip(poly.loop_indices,coords): uv.data[li].uv=coord
    # Consistent outward normals on the closed radial surface.
    bpy.context.view_layer.objects.active=obj; obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    obj.select_set(False)
    return obj


def bake_body_material(obj, name):
    # Triplanar projection uses physical object coordinates so edge detail never
    # stretches into horizontal bands. Bake it into a non-overlapping UV atlas.
    for material in obj.data.materials:
        ns,links=material.node_tree.nodes,material.node_tree.links
        bsdf=ns.get('Principled BSDF')
        col=next(n for n in ns if n.type=='TEX_IMAGE' and n.image and 'albedo' in n.image.name)
        col.projection='BOX';col.projection_blend=.30
        coord=ns.new('ShaderNodeTexCoord');scale=ns.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs[3].default_value=1/2.4
        links.new(coord.outputs['Object'],scale.inputs[0]);links.new(scale.outputs['Vector'],col.inputs['Vector'])
        for link in list(bsdf.inputs['Normal'].links):links.remove(link)
        bump=ns.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.24 if name=='patty' else .12
        bump.inputs['Distance'].default_value=.012 if name=='patty' else .003
        links.new(col.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
        for link in list(bsdf.inputs['Base Color'].links):links.remove(link)
        multiply=ns.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
        multiply.inputs[2].default_value=(.75,.67,.56,1) if 'crust' in material.name.lower() else ((.88,.78,.62,1) if 'bread' in material.name.lower() else (.82,.79,.75,1))
        links.new(col.outputs['Color'],multiply.inputs[1]);links.new(multiply.outputs[0],bsdf.inputs['Base Color'])
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.018)
    bpy.ops.object.mode_set(mode='OBJECT')
    baked={}
    for kind in ['DIFFUSE','NORMAL']:
        image=bpy.data.images.new('core-'+name+'-'+kind.lower(),width=1536,height=1536,alpha=False)
        if kind=='NORMAL':image.colorspace_settings.name='Non-Color'
        nodes=[]
        for material in obj.data.materials:
            target=material.node_tree.nodes.new('ShaderNodeTexImage');target.image=image;material.node_tree.nodes.active=target;nodes.append((material,target))
        scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
        scene.render.bake.margin=12
        bpy.ops.object.bake(type=kind)
        image.filepath_raw=str(TEX/('core-'+name+'-'+kind.lower()+('.jpg' if kind=='DIFFUSE' else '.png')))
        image.file_format='JPEG' if kind=='DIFFUSE' else 'PNG';image.save();baked[kind]=image
        for material,target in nodes:material.node_tree.nodes.remove(target)
    final=bpy.data.materials.new(name+' baked food');final.use_nodes=True
    ns,links=final.node_tree.nodes,final.node_tree.links;b=ns.get('Principled BSDF')
    b.inputs['Roughness'].default_value=.5 if name=='patty' else .44
    b.inputs['Specular IOR Level'].default_value=.27
    if name.startswith('bun'):
        b.inputs['Coat Weight'].default_value=.08;b.inputs['Coat Roughness'].default_value=.48
    col=ns.new('ShaderNodeTexImage');col.image=baked['DIFFUSE'];links.new(col.outputs['Color'],b.inputs['Base Color'])
    normaltex=ns.new('ShaderNodeTexImage');normaltex.image=baked['NORMAL'];normal=ns.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.5
    links.new(normaltex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],b.inputs['Normal'])
    obj.data.materials.clear();obj.data.materials.append(final)
    for poly in obj.data.polygons:poly.material_index=0

def export(name, objects):
    bake_body_material(objects[0],name)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    # Normalize every mesh into the same ingredient coordinate frame. Joined
    # sesame geometry otherwise retains the first seed's rotated local basis,
    # causing conservative browser bounding boxes and stack height to inflate.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    file=OUT/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_image_format='AUTO',export_texcoords=True,export_normals=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects if o.type=='MESH')
    print('CORE_ASSET',name,'triangles',triangles,'bytes',file.stat().st_size,flush=True)
    for o in objects: o.hide_render=True; o.hide_viewport=True; o.select_set(False)
    return {'file':name+'.glb','triangles':triangles,'bytes':file.stat().st_size,'method':'original authored closed geometry with chat-generated photographic color maps and Blender-baked tangent normals'}

# Upper bun: a shallow bakery dome, complete cut underside, and actual sesame geometry.
profile=[]
for k in range(65):
    t=.002+(math.pi/2-.002)*k/64
    profile.append((math.sin(t),.10+.54*math.cos(t)**1.26,0,'top'))
profile += [(1.002,.08,0,'side'),(.995,.055,1,'side'),(.975,.025,1,'side')]
for k in range(1,21): profile.append((.975*(1-k/21),.012,1,'top'))
profile.append((.001,.012,1,'top'))
upper=lathe('Upper bun',profile,1.215,[crust,crumb],'upper')
seed_objects=[]
for i in range(142):
    a=random.uniform(0,2*math.pi); r=math.sqrt(random.uniform(.008,.88**2)); x,y=1.215*r*math.cos(a),1.215*r*math.sin(a)
    z=.10+.54*(1-r*r)**.63
    slope=-.54*1.26*r/max(.02,(1-r*r)**.37)/1.215
    normal=Vector((-slope*math.cos(a),-slope*math.sin(a),1)).normalized()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=1,location=(x,y,z+.005))
    seed=bpy.context.object; seed.name='Natural sesame seed'
    seed.scale=(random.uniform(.033,.044),random.uniform(.013,.018),random.uniform(.008,.011))
    seed.rotation_mode='QUATERNION'
    seed.rotation_quaternion=normal.to_track_quat('Z','Y')
    from mathutils import Quaternion
    seed.rotation_quaternion=seed.rotation_quaternion @ Quaternion(Vector((0,0,1)),random.uniform(0,6.28))
    seed.data.materials.append(random.choice(seeds_mat))
    for p in seed.data.polygons:p.use_smooth=True
    seed_objects.append(seed)
bpy.ops.object.select_all(action='DESELECT')
for o in seed_objects:o.select_set(True)
bpy.context.view_layer.objects.active=seed_objects[0]; bpy.ops.object.join()
seed_mesh=bpy.context.object; seed_mesh.name='Sesame seeds'
receipts=[export('bun-top',[upper,seed_mesh])]

# Lower bun's cut crumb remains complete when all toppings are absent.
profile=[]
for k in range(49):
    r=.001+.955*k/48
    profile.append((r,.235+.014*(1-r*r),1,'top'))
profile += [(.980,.222,1,'top'),(1,.190,0,'side'),(1.008,.137,0,'side'),(1.003,.082,0,'side'),(.983,.033,0,'side'),(.955,.012,0,'side')]
for k in range(1,19): profile.append((.955*(1-k/19),.008,0,'top'))
profile.append((.001,.008,0,'top'))
lower=lathe('Lower bun',profile,1.20,[crust,crumb],'lower')
receipts.append(export('bun-bottom',[lower]))

# Patty: asymmetrical hand-formed outline, actual coarse crust relief, complete surfaces.
profile=[]
for k in range(73):
    r=.001+.97*k/72
    profile.append((r,.195+.09*(1-r*r)**.5,0,'top'))
for k in range(1,19):
    t=math.pi*k/18
    profile.append((.97+.045*math.sin(t),.195-(.195-.055)*k/18,0,'side'))
for k in range(1,33):
    r=.97*(1-k/33)
    profile.append((r,.043+.006*(1-r*r),0,'top'))
profile.append((.001,.045,0,'top'))
patty=lathe('Griddled beef patty',profile,1.16,[beef],'beef',segments=176)
receipts.append(export('patty',[patty]))
(OUT/'core-provenance.json').write_text(json.dumps({'original_assets':True,'paid_generation_credits':0,'geometry_authoring':'Blender 4.5.15','textures':'OpenAI built-in image generation; original texture PNGs retained','assets':receipts},indent=2)+'\n')

# Evidence render of actual authored meshes, not a generated mockup.
for obj in [upper,seed_mesh,lower,patty]:obj.hide_render=False;obj.hide_viewport=False
lower.location=(0,0,0)
patty.location=(0,0,.23)
upper.location=(0,0,.50);seed_mesh.location.z += .50
world=bpy.data.worlds.new('Studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes.get('Background').inputs[0].default_value=(.82,.85,.88,1)
world.node_tree.nodes.get('Background').inputs[1].default_value=.35
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.02)); floor=bpy.context.object;floor.data.materials.append(solid('Warm white studio',(0.82,.82,.81),.8))
def area(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,0,.5))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Key',(-3,-4,5),500,4);area('Fill',(4,-2,3),180,4);area('Rim',(2,4,4),300,3)
bpy.ops.object.camera_add(location=(3.5,-6.0,3.0)); cam=bpy.context.object
cam.rotation_euler=(Vector((0,0,.55))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=60;scene.camera=cam
scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.cycles.samples=32
scene.view_settings.view_transform='AgX'
scene.render.filepath=str(PREVIEW/'core-burger.png')
bpy.ops.wm.save_as_mainfile(filepath=str(PREVIEW/'core-burger.blend'))
bpy.ops.render.render(write_still=True)
