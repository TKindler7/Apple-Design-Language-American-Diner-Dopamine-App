"""Original burger ingredient meshes and chat-generated photographic materials.

Run with Blender --background --python scripts/burger-assets/toppings.py.
No downloaded food models, model weights, online inference, or paid services.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise_vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/models/burger-pilot'
TEX = OUT / 'textures'
TAU = math.tau
random.seed(310)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mesh(name, verts, faces, uv=None, material=None):
    data=bpy.data.meshes.new(name); data.from_pydata(verts, [], faces); data.update()
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    if uv:
        layer=data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            for index in poly.loop_indices:
                layer.data[index].uv=uv[data.loops[index].vertex_index]
    for poly in data.polygons: poly.use_smooth=True
    if material: data.materials.append(material)
    return obj

def solidify(obj, thickness=.012):
    mod=obj.modifiers.new('Actual ingredient thickness','SOLIDIFY'); mod.thickness=thickness; mod.offset=0
    bpy.context.view_layer.objects.active=obj; obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name); obj.select_set(False)

def material(name, color=(.5,.5,.5,1), rough=.42, image=None, normal=None):
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    p=mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=color; p.inputs['Roughness'].default_value=rough
    p.inputs['Specular IOR Level'].default_value=.27
    if image:
        node=mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image=bpy.data.images.load(str(TEX/image),check_existing=True)
        mat.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
    if normal:
        node=mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image=bpy.data.images.load(str(TEX/normal),check_existing=True); node.image.colorspace_settings.name='Non-Color'
        normal_node=mat.node_tree.nodes.new('ShaderNodeNormalMap'); normal_node.inputs['Strength'].default_value=.45
        mat.node_tree.links.new(node.outputs['Color'],normal_node.inputs['Color']); mat.node_tree.links.new(normal_node.outputs['Normal'],p.inputs['Normal'])
    return mat

def normal_bake(stem, strength, distance):
    """Bake actual Blender material normals; never present a texture as a mesh."""
    dest=TEX/f'{stem}-normal.png'
    if dest.exists(): return dest.name
    mat=material('Bake '+stem,image=stem+'-color.png')
    n=mat.node_tree.nodes; l=mat.node_tree.links; p=n.get('Principled BSDF')
    source=next(node for node in n if node.type=='TEX_IMAGE')
    bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=strength; bump.inputs['Distance'].default_value=distance
    l.new(source.outputs['Color'],bump.inputs['Height']); l.new(bump.outputs['Normal'],p.inputs['Normal'])
    target=bpy.data.images.new(stem+' normal',1024,1024,alpha=False); target.colorspace_settings.name='Non-Color'
    tex=n.new('ShaderNodeTexImage'); tex.image=target; n.active=tex
    plane=mesh('bake plane',[(-1,-1,0),(1,-1,0),(1,1,0),(-1,1,0)],[(0,1,2,3)],[(0,0),(1,0),(1,1),(0,1)],mat)
    bpy.ops.object.select_all(action='DESELECT'); plane.select_set(True); bpy.context.view_layer.objects.active=plane
    scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=1; scene.cycles.device='CPU'; scene.render.bake.margin=8
    bpy.ops.object.bake(type='NORMAL')
    target.filepath_raw=str(dest); target.file_format='PNG'; target.save()
    bpy.data.objects.remove(plane,do_unlink=True)
    return dest.name

normals={
 'lettuce':normal_bake('topping-lettuce',.15,.022),
 'tomato':normal_bake('topping-tomato',.10,.008),
 'bacon':normal_bake('topping-bacon',.2,.025),
 'pickle':normal_bake('topping-pickle',.10,.012),
 'onion':normal_bake('topping-onion',.08,.007),
 'cheddar':normal_bake('topping-cheddar',.045,.004),
 'swiss':normal_bake('topping-swiss',.045,.004),
}
leafmat=material('Fresh leaf tissue',rough=.53,image='topping-lettuce-color.png',normal=normals['lettuce'])
tomatomat=material('Fresh tomato cut face',rough=.37,image='topping-tomato-color.png',normal=normals['tomato'])
tomatoskin=material('Tomato skin',(0.52,.018,.009,1),.34)
baconmat=material('Crisp rendered bacon',rough=.45,image='topping-bacon-color.png',normal=normals['bacon'])

def polar_disk(name,radius,height,mat,skin=None,seed=1,segments=128,rings=24,variation=.012):
    verts=[]; uvs=[]; faces=[]; mats=[]
    for side in [0,1]:
        for ri in range(rings+1):
            r=radius*ri/rings
            for ti in range(segments):
                t=TAU*ti/segments
                rr=r*(1+variation*math.sin(5*t+seed)+variation*.7*math.cos(9*t-seed))
                z=height*side + .004*math.sin(13*t+seed)*(ri/rings)**2
                if ri and ri<rings: z += .003*math.sin(r*22+seed)*math.sin(t*7)*(ri/rings)
                verts.append((rr*math.cos(t),rr*math.sin(t),z)); uvs.append((.5+.492*rr/radius*math.cos(t),.5+.492*rr/radius*math.sin(t)))
    stride=(rings+1)*segments
    for side in [0,1]:
        for ri in range(rings):
            for ti in range(segments):
                a=side*stride+ri*segments+ti; b=side*stride+ri*segments+(ti+1)%segments; c=b+segments; d=a+segments
                if ri==0:
                    faces.append((a,d,c) if side else (a,c,d))
                else:
                    faces.append((d,c,b,a) if side else (a,b,c,d))
                mats.append(0)
    for ti in range(segments):
        a=rings*segments+ti; b=rings*segments+(ti+1)%segments
        faces.append((a,b,b+stride,a+stride)); mats.append(1 if skin else 0)
    obj=mesh(name,verts,faces,uvs,mat)
    if skin: obj.data.materials.append(skin)
    for poly,index in zip(obj.data.polygons,mats): poly.material_index=index
    return obj

def build_lettuce():
    objects=[]
    # Six overlapping leaves. The outer rim ruffles at several scales, while the
    # central tissue stays low enough to contact the tomato and bread.
    for k in range(6):
        verts=[]; uv=[]; faces=[]; rows=48; cols=64
        theta=k*TAU/6+.16*math.sin(k*2); length=1.35+.08*math.sin(k); width=.68
        for j in range(rows+1):
            v=j/rows
            spread=width*(.35+.65*math.sin(math.pi*v)**.65)
            for i in range(cols+1):
                u=i/cols; edge=abs(2*u-1)
                x=(u-.5)*2*spread*(1+.05*math.sin(v*35+k))
                y=v*length-.1
                wave=(.075*math.sin(v*29+k)+.035*math.sin(v*71+k*2))*edge**3
                z=.075+.025*math.sin(v*4+k)+.018*math.cos(u*17+v*23)+wave
                z+=.05*edge**2+.035*v*v
                xx=x*math.cos(theta)-y*math.sin(theta); yy=x*math.sin(theta)+y*math.cos(theta)
                verts.append((xx,yy,z)); uv.append((u,.04+.92*v))
        for j in range(rows):
            for i in range(cols):
                a=j*(cols+1)+i; faces.append((a,a+1,a+cols+2,a+cols+1))
        obj=mesh('Lettuce leaf '+str(k+1),verts,faces,uv,leafmat); solidify(obj,.009); objects.append(obj)
    return objects

def build_tomato():
    result=[]
    for k,(x,y) in enumerate([(-.44,-.07),(.42,.11)]):
        obj=polar_disk('Tomato slice '+str(k+1),.74,.115,tomatomat,tomatoskin,segments=128,rings=24,seed=k+1)
        obj.location=(x,y,k*.012); obj.rotation_euler.z=k*1.3; result.append(obj)
    return result

def build_bacon():
    result=[]
    for k in range(2):
        verts=[]; uv=[]; faces=[]; rows=100; cols=18
        for j in range(rows+1):
            v=j/rows; y=(v-.5)*2.2
            for i in range(cols+1):
                u=i/cols; x=(u-.5)*.38*(1+.12*math.sin(v*39+k))
                x+=.04*math.sin(v*13+k)
                z=.065+.04*math.sin(v*18+k)+.024*math.cos(u*7+v*29)+.013*math.sin(v*71+u*9)
                verts.append((x,y,z)); uv.append((.04+.9*u,.02+.96*v))
        for j in range(rows):
            for i in range(cols):
                a=j*(cols+1)+i; faces.append((a,a+1,a+cols+2,a+cols+1))
        obj=mesh('Bacon strip '+str(k+1),verts,faces,uv,baconmat); solidify(obj,.022)
        obj.rotation_euler.z=(-.62 if k==0 else .62); obj.location.x=(-.28 if k==0 else .28); obj.location.z=k*.025; result.append(obj)
    return result

def build_cheese(kind):
    color=(.86,.34,.018,1) if kind=='cheddar' else (.82,.69,.36,1)
    mat=material('Melted '+kind,color,.45,image=f'topping-{kind}-color.png',normal=normals[kind])
    n=84; verts=[]; uv=[]; faces=[]
    holes=[(-.38,.38,.12),(.42,-.18,.16),(.19,.55,.09),(-.45,-.36,.10)] if kind=='swiss' else []
    for j in range(n+1):
        v=j/n; y=(v-.5)*2.16
        for i in range(n+1):
            u=i/n; x=(u-.5)*2.16
            corner=.045*(abs(x*y)/(1.08**2))**8
            xx=x*(1-corner); yy=y*(1-corner)
            r=math.hypot(xx,yy); t=math.atan2(yy,xx)
            drop=max(0,r-1.025)
            edge=max(abs(x),abs(y))/1.08
            rr=min(r,1.15+max(0,r-1.15)*.19)
            rr*=1+edge**8*(.006*math.sin(t*11+.4)+.005*math.sin(t*7+1.3))
            z=.025-.39*drop*(1+.09*math.sin(t*3+.8))+.006*math.sin(x*8)*math.sin(y*9)
            verts.append((rr*math.cos(t),rr*math.sin(t),z)); uv.append((u,v))
    for j in range(n):
        for i in range(n):
            x=(i+.5)/n*2.16-1.08; y=(j+.5)/n*2.16-1.08
            if any((x-hx)**2+(y-hy)**2<r*r for hx,hy,r in holes): continue
            a=j*(n+1)+i; faces.append((a,a+1,a+n+2,a+n+1))
    obj=mesh('Soft melted '+kind,verts,faces,uv,mat)
    smooth=obj.modifiers.new('Soften melted slice boundaries','SMOOTH'); smooth.factor=.38; smooth.iterations=3
    bpy.context.view_layer.objects.active=obj; obj.select_set(True); bpy.ops.object.modifier_apply(modifier=smooth.name); obj.select_set(False)
    solidify(obj,.014)
    bevel=obj.modifiers.new('Soft edible edges','BEVEL'); bevel.width=.008; bevel.segments=2; bevel.limit_method='ANGLE'; bevel.angle_limit=.7
    bpy.context.view_layer.objects.active=obj; obj.select_set(True); bpy.ops.object.modifier_apply(modifier=bevel.name); obj.select_set(False)
    return [obj]

def build_onion():
    result=[]
    face=material('Onion cut tissue',rough=.43,image='topping-onion-color.png',normal=normals['onion'])
    membrane=material('Thin purple onion membrane',(.37,.13,.25,1),.47)
    # Rounded rectangular cross sections produce flat cut tissue, not torus tubes.
    section=[(1,-.8),(1,.8),(.78,1),(-.78,1),(-1,.8),(-1,-.8),(-.78,-1),(.78,-1)]
    for k,(cx,cy,r,rot) in enumerate([(-.35,.16,.52,.4),(.35,-.16,.47,-.5),(.05,.42,.40,.7)]):
        for ring in range(2):
            radius=r-ring*.095; verts=[]; uv=[]; faces=[]; seg=128; around=8
            for j in range(seg):
                t=TAU*j/seg; rad=radius*(1+.025*math.sin(t*5+k))
                for q in range(around):
                    sx,sz=section[q]; rr=rad+.034*sx; z=.028+.018*sz+.005*math.sin(t*3+k)
                    verts.append((cx+rr*math.cos(t),cy+rr*math.sin(t)*.9,z+k*.015)); uv.append((.5+.48*rr/r*math.cos(t),.5+.48*rr/r*math.sin(t)))
            for j in range(seg):
                for q in range(around):
                    a=j*around+q; b=j*around+(q+1)%around; c=((j+1)%seg)*around+(q+1)%around; d=((j+1)%seg)*around+q; faces.append((d,c,b,a))
            obj=mesh('Red onion ring '+str(k)+'-'+str(ring),verts,faces,uv,face); obj.data.materials.append(membrane)
            for poly in obj.data.polygons:
                if poly.index%around in [0,4]: poly.material_index=1
            result.append(obj)
    return result

def build_pickle():
    result=[]
    flesh=material('Pickled cucumber cut face',rough=.42,image='topping-pickle-color.png',normal=normals['pickle'])
    skin=material('Pickled cucumber skin',(.085,.14,.025,1),.48)
    for k,(x,y) in enumerate([(-.48,-.2),(.32,-.39),(.13,.38)]):
        obj=polar_disk('Dill pickle coin '+str(k+1),.39,.065,flesh,skin,seed=k+3,segments=96,rings=22,variation=.04)
        for vertex in obj.data.vertices:
            if vertex.co.z>.03:
                vertex.co.z+=.004*math.cos(vertex.co.x*72+k)*(.6+.4*math.cos(vertex.co.y*9))
        obj.location=(x,y,.01*k); result.append(obj)
    return result

def build_sauce(kind):
    mat=material('House sauce' if kind=='house' else 'Smoky sauce',(.65,.30,.10,1) if kind=='house' else (.18,.065,.025,1),.38)
    obj=polar_disk('Thin '+kind+' sauce spread',1.02,.024,mat,seed=17 if kind=='house' else 19,segments=160,rings=28,variation=.028)
    for v in obj.data.vertices:
        if v.co.z>.012: v.co.z+=.006*math.sin(v.co.x*11+v.co.y*9)*math.sin(v.co.y*15)
    return [obj]

def export(name,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.update()
    corners=[obj.matrix_world @ Vector(c) for obj in objects for c in obj.bound_box]
    low=[min(p[i] for p in corners) for i in range(3)]; high=[max(p[i] for p in corners) for i in range(3)]
    sizes=[high[i]-low[i] for i in range(3)]
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{name}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_image_format='AUTO',export_materials='EXPORT',export_cameras=False,export_lights=False)
    result={'file':name+'.glb','dimensionsXYZ_blender':sizes,'minZ':low[2],'maxZ':high[2],'meshTriangles':sum(len(obj.data.loop_triangles) if obj.type=='MESH' else 0 for obj in objects),'bytes':(OUT/f'{name}.glb').stat().st_size}
    for obj in objects:bpy.data.objects.remove(obj,do_unlink=True)
    print('EXPORTED',name,json.dumps(result),flush=True)
    return result

builders={'lettuce':build_lettuce,'tomato':build_tomato,'bacon':build_bacon,'cheddar':lambda:build_cheese('cheddar'),'swiss':lambda:build_cheese('swiss'),'onion':build_onion,'pickle':build_pickle,'sauce-house':lambda:build_sauce('house'),'sauce-smoky':lambda:build_sauce('smoky')}
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(builders)
report_path=OUT/'toppings-authoring-report.json'
report=json.loads(report_path.read_text()) if report_path.exists() else {}
report.update({name:export(name,builders[name]()) for name in selected})
(OUT/'toppings-authoring-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('DONE: nine independent authored ingredient models.',flush=True)
