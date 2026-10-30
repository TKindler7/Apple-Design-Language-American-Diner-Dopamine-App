"""Original modular drink/dessert assets with built-in chat-generated food maps.
Run: Blender --background --python scripts/food-assets/sweet.py
All GLBs have applied transforms and embedded materials. No downloaded models.
"""
from pathlib import Path
import bpy, math, random, json, sys
from mathutils import Vector
from mathutils.noise import noise_vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/models/sweet'; TEX=OUT/'textures'; OUT.mkdir(parents=True,exist_ok=True)
random.seed(627)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=1
scene.view_settings.view_transform='Standard'


def mesh(name,verts,faces,mat=None,uv=None):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    if mat:data.materials.append(mat)
    for p in data.polygons:p.use_smooth=True
    if uv:
        layer=data.uv_layers.new(name='UVMap')
        for p in data.polygons:
            for i in p.loop_indices:layer.data[i].uv=uv[data.loops[i].vertex_index]
    return obj

def solid(name,color,rough=.5,transmission=0,ior=1.45,metallic=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1)
    b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metallic
    b.inputs['Specular IOR Level'].default_value=.28;b.inputs['IOR'].default_value=ior
    b.inputs['Transmission Weight'].default_value=transmission
    return m

def textured(name,stem,rough=.6,tint=None,relief=.006):
    image=bpy.data.images.load(str(TEX/(stem+'-source.png')),check_existing=True)
    if max(image.size)>1024:image.scale(1024,1024)
    image.filepath_raw=str(TEX/(stem+'-color.jpg'));image.file_format='JPEG';image.save()
    m=solid(name,(1,1,1),rough);ns=m.node_tree.nodes;links=m.node_tree.links;b=ns.get('Principled BSDF')
    tex=ns.new('ShaderNodeTexImage');tex.image=image
    if tint:
        mix=ns.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*tint,1)
        links.new(tex.outputs['Color'],mix.inputs[1]);links.new(mix.outputs[0],b.inputs['Base Color'])
    else:links.new(tex.outputs['Color'],b.inputs['Base Color'])
    # Portable tangent-space normal map from a restrained food-surface bump bake.
    normalpath=TEX/(stem+'-normal.png')
    if not normalpath.exists():
        bump=ns.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=relief
        links.new(tex.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],b.inputs['Normal'])
        plane=mesh('Normal bake',[(-1,-1,0),(1,-1,0),(1,1,0),(-1,1,0)],[(0,1,2,3)],m,[(0,0),(1,0),(1,1),(0,1)])
        target=bpy.data.images.new(stem+' normal',1024,1024,alpha=False);target.colorspace_settings.name='Non-Color'
        tn=ns.new('ShaderNodeTexImage');tn.image=target;ns.active=tn
        bpy.ops.object.select_all(action='DESELECT');plane.select_set(True);bpy.context.view_layer.objects.active=plane
        scene.render.bake.margin=8;bpy.ops.object.bake(type='NORMAL')
        target.filepath_raw=str(normalpath);target.file_format='PNG';target.save()
        bpy.data.objects.remove(plane,do_unlink=True);ns.remove(bump);ns.remove(tn)
    normalimage=bpy.data.images.load(str(normalpath),check_existing=True);normalimage.colorspace_settings.name='Non-Color'
    tn=ns.new('ShaderNodeTexImage');tn.image=normalimage;n=ns.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.45
    links.new(tn.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],b.inputs['Normal'])
    return m

ice_mat=textured('Frozen vanilla dairy','icecream',.74,relief=.008)
choc_ice=textured('Chocolate ice cream','icecream',.76,tint=(.48,.30,.18),relief=.008)
pastry=textured('Flaky golden pastry','pastry',.65,relief=.006)
crumb=textured('Graham biscuit crumb','crumb',.86,relief=.014)
brownie=textured('Crackled chocolate brownie','brownie',.55,relief=.012)
brownie_side=textured('Dense chocolate crumb','crumb',.8,tint=(.11,.044,.018),relief=.014)
cream=textured('Fresh piped cream','cheesecake',.55,relief=.003)
cheesecake_mat=textured('Creamy cheesecake filling','cheesecake',.64,relief=.003)
apple_texture=textured('Cooked cinnamon apple filling','apple',.40,relief=.007)
applemats=[solid('Cinnamon apple '+str(i),c,.35) for i,c in enumerate([(.56,.23,.055),(.68,.34,.09),(.77,.42,.13)])]
fudge=solid('Dark chocolate fudge',(.045,.016,.008),.27)
cherry_mat=solid('Glazed cherry',(.29,.007,.014),.24)
compote_mat=solid('Cherry compote glaze',(.18,.004,.011),.25)
stem_mat=solid('Cherry stem',(.09,.064,.013),.67)
nut_mat=solid('Toasted chopped almonds',(.49,.26,.09),.77)
glass=solid('Clear diner glass',(.97,.985,1),.055,1,1.46)
iceglass=solid('Clear ice',(.88,.96,1),.13,.94,1.31)
icecloud=solid('Tiny frozen air bubbles',(.8,.88,.92),.25,.15,1.31)
ceramic=solid('Ivory porcelain',(.88,.87,.83),.23)
iron=solid('Seasoned cast iron',(.022,.024,.027),.77,metallic=.35)
white=solid('Paper straw',(.88,.84,.75),.76)


def lathe(name,profile,mat,segments=96,flute=0):
    verts=[];faces=[];uv=[]
    for k,(r,z) in enumerate(profile):
        for j in range(segments):
            a=math.tau*j/segments;rr=max(.0001,r+flute*math.cos(12*a)*min(1,z/.25))
            verts.append((rr*math.cos(a),rr*math.sin(a),z));uv.append((j/segments,k/(len(profile)-1)))
    for k in range(len(profile)-1):
        for j in range(segments):
            a=k*segments+j;b=k*segments+(j+1)%segments;faces.append((a,b,b+segments,a+segments))
    faces.append(tuple(reversed(range(segments))));faces.append(tuple((len(profile)-1)*segments+j for j in range(segments)))
    return mesh(name,verts,faces,mat,uv)

def sphere(name,loc,scale,mat,seed=1,detail=48,noise=.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=detail,ring_count=detail//2,radius=1,location=loc)
    obj=bpy.context.object;obj.name=name;obj.scale=scale;obj.data.materials.append(mat)
    if noise:
        for v in obj.data.vertices:
            co=v.co.copy();v.co*=1+noise*noise_vector(co*7+Vector((seed,2,3))).x+noise*.4*noise_vector(co*29).y
    for p in obj.data.polygons:p.use_smooth=True
    return obj

def tube(name,points,radius,mat,sides=10,ridges=0,taper=False):
    verts=[];faces=[];uv=[]
    for k,point in enumerate(points):
        p=Vector(point);t=(Vector(points[min(k+1,len(points)-1)])-Vector(points[max(0,k-1)])).normalized()
        axis=Vector((0,0,1)) if abs(t.z)<.9 else Vector((1,0,0));u=t.cross(axis).normalized();v=t.cross(u).normalized()
        factor=1
        if taper:factor=max(.03,(1-k/max(1,len(points)-1))**.32)
        for j in range(sides):
            a=math.tau*j/sides;r=radius*factor*(1+ridges*math.cos(a*8))
            co=p+r*(math.cos(a)*u+math.sin(a)*v);verts.append(tuple(co));uv.append((j/sides,k/(len(points)-1)))
    for k in range(len(points)-1):
        for j in range(sides):
            a=k*sides+j;b=k*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(sides))));faces.append(tuple((len(points)-1)*sides+j for j in range(sides)))
    return mesh(name,verts,faces,mat,uv)

def rounded_box(name,loc,scale,mat,bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);obj=bpy.context.object;obj.name=name;obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.data.materials.append(mat)
    mod=obj.modifiers.new('Soft irregular corners','BEVEL');mod.width=bevel;mod.segments=3
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in obj.data.polygons:p.use_smooth=True
    return obj

def wedge(name,z,h,mat,r=2.1,angle=.51,texture_scale=2.5):
    # A true cake wedge: curved back, flat cut faces, complete top and underside.
    outline=[(0,-1.05)]+[(r*math.sin(-angle+2*angle*i/42),r*math.cos(-angle+2*angle*i/42)-1.05) for i in range(43)]
    verts=[(x,y,z+side*h) for side in [0,1] for x,y in outline];n=len(outline)
    faces=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    obj=mesh(name,verts,faces,mat)
    # Explicit planar UVs on top/bottom and physical side coordinates.
    layer=obj.data.uv_layers.new(name='UVMap')
    for p in obj.data.polygons:
        for li in p.loop_indices:
            x,y,zz=verts[obj.data.loops[li].vertex_index]
            layer.data[li].uv=(.5+x/texture_scale,.5+y/texture_scale) if p.index<2 else (x/texture_scale+y/texture_scale,zz/texture_scale)
        p.use_smooth=False
    bevel=obj.modifiers.new('Natural cut edge','BEVEL');bevel.width=.022;bevel.segments=3
    bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.modifier_apply(modifier=bevel.name);obj.select_set(False)
    return obj

def bake_tint(mat):
    # Blender glTF exports texture * baseColorFactor. Replace authoring MixRGB with
    # an explicit constant factor so no material loses its chocolate tint.
    b=mat.node_tree.nodes.get('Principled BSDF');links=mat.node_tree.links
    if b.inputs['Base Color'].is_linked:
        link=b.inputs['Base Color'].links[0]
        if link.from_node.type=='MIX_RGB':
            mix=link.from_node;tex=mix.inputs[1].links[0].from_node;tint=tuple(mix.inputs[2].default_value)
            links.remove(link);links.new(tex.outputs['Color'],b.inputs['Base Color']);b.inputs['Base Color'].default_value=tint
            # Exporter does not multiply an unlinked socket default when linked;
            # bake the image color through Blender's image pixels for production.
            source=tex.image;pixels=list(source.pixels[:]);result=bpy.data.images.new(mat.name+' tint',source.size[0],source.size[1],alpha=False)
            for i in range(0,len(pixels),4):
                pixels[i]*=tint[0];pixels[i+1]*=tint[1];pixels[i+2]*=tint[2]
            result.pixels[:]=pixels;result.filepath_raw=str(TEX/(mat.name.lower().replace(' ','-')+'.jpg'));result.file_format='JPEG';result.save();tex.image=result
            b.inputs['Base Color'].default_value=(1,1,1,1)
            mat.node_tree.nodes.remove(mix)
for mat in [choc_ice,brownie_side]:bake_tint(mat)

manifest={'version':1,'ingredients':{}};report={}
def export(key,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.hide_render=False;o.hide_viewport=False;o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    # Make normals consistent on closed solids; thin transparent glass has an inner shell.
    for o in objects:
        if o.type!='MESH':continue
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    coords=[o.matrix_world@Vector(v) for o in objects if o.type=='MESH' for v in o.bound_box]
    low=Vector([min(v[i] for v in coords) for i in range(3)]);high=Vector([max(v[i] for v in coords) for i in range(3)])
    width=max(high.x-low.x,high.y-low.y)
    path=OUT/(key+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_image_format='JPEG',export_jpeg_quality=88,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
    manifest['ingredients'][key]={'url':'./'+path.name,'width':round(width,6)}
    report[key]={'width':width,'height':high.z-low.z,'bounds':[list(low),list(high)],'bytes':path.stat().st_size,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects if o.type=='MESH')}
    print('SWEET_ASSET',key,report[key],flush=True)
    for o in objects:bpy.data.objects.remove(o,do_unlink=True)

# Hollow, physically modeled glass wall and lip; no painted opaque vessel.
export('sweet-glass',[lathe('Tapered diner glass',[(.0001,0),(.48,0),(.53,.055),(.54,.13),(.575,.8),(.625,1.7),(.685,2.63),(.685,2.665),(.664,2.675),(.642,2.655),(.603,1.7),(.553,.8),(.516,.15),(.0001,.15)],glass,128,flute=.006)])
for key,col in [('cherry',(.64,.27,.31)),('vanilla',(.76,.66,.49)),('chocolate',(.19,.075,.032))]:
    mat=solid(key+' thick milkshake',col,.48)
    items=[lathe(key+' shake',[(.0001,0),(.49,0),(.53,.55),(.57,1.35),(.615,2.28),(.60,2.30),(.0001,2.31)],mat)]
    # Small physical bubbles break up the flat milkshake meniscus.
    for i in range(45):
        a=random.random()*math.tau;r=math.sqrt(random.random())*.58
        items.append(sphere('Milkshake surface bubble',(math.cos(a)*r,math.sin(a)*r,2.305),(random.uniform(.006,.014),)*2+(.004,),mat,detail=10))
    export('sweet-shake-'+key,items)
for key,col,trans in [('soda',(.62,.05,.072),.62),('coldbrew',(.065,.018,.005),.38)]:
    mat=solid(key+' liquid',col,.17,trans,1.333)
    items=[lathe(key+' liquid volume',[(.0001,0),(.49,0),(.53,.55),(.57,1.35),(.615,2.26),(.60,2.28),(.0001,2.28)],mat)]
    if key=='soda':
        for i in range(62):
            a=random.random()*math.tau;z=random.uniform(.05,2.25);r=.49+.12*z/2.25
            items.append(sphere('Carbonation bubble',(math.cos(a)*r,math.sin(a)*r,z),(.008,)*3,glass,detail=8))
    export('sweet-'+key,items)
cube=rounded_box('Melting ice cube',(0,0,.16),(.33,.34,.32),iceglass,.045)
for v in cube.data.vertices:v.co+=Vector((.002*math.sin(v.co.y*44),.003*math.cos(v.co.x*32),.002*math.sin(v.co.y*33)))
iceobjects=[cube]
for i in range(9):iceobjects.append(sphere('Ice air inclusion',(random.uniform(-.1,.1),random.uniform(-.1,.1),random.uniform(.08,.24)),(random.uniform(.006,.013),)*3,icecloud,detail=8))
export('sweet-ice',iceobjects)
export('sweet-straw',[lathe('Paper straw',[(.043,0),(.043,2.9),(.032,2.9),(.032,0)],white,32)])

for key,mat in [('vanilla',ice_mat),('chocolate',choc_ice)]:
    obj=sphere('Hand scooped '+key,(0,0,.44),(.52,.50,.47),mat,seed=4,detail=96,noise=.043)
    for v in obj.data.vertices:
        co=v.co;theta=math.atan2(co.y,co.x)
        # Broken scoop striations and a ruffled lower skirt, not a perfect sphere.
        co*=1+.014*math.sin(theta*28+co.z*8)*max(0,1-abs(co.z))
        if co.z<-.45:co.x*=1.035;co.y*=1.035;co.z=max(co.z,-.80)
    export('sweet-icecream-'+key,[obj])
points=[]
for i in range(260):
    t=i/259;a=t*math.tau*2.75;r=.29*(1-t)**.82*(1+.055*math.sin(2.5*a)+.025*math.cos(6*a))
    points.append((r*math.cos(a)+.035*t*t,r*math.sin(a)-.025*t*t,.12+.51*t+.012*math.sin(a*2.2)*(1-t)))
whip=[sphere('Cream base',(0,0,.10),(.37,.37,.10),cream,detail=48),tube('Piped cream ridges',points,.135,cream,sides=48,ridges=.24,taper=True)]
for v in whip[1].data.vertices:v.co.z=max(0,v.co.z)
export('sweet-whipped-cream',whip)
berry=sphere('Fresh cherry',(0,0,.14),(.145,.15,.14),cherry_mat,detail=56,noise=.018)
for v in berry.data.vertices:
    if v.co.z>.35:v.co.z-=.18*math.exp(-((v.co.x/.3)**2+(v.co.y/.3)**2))
cherrystem=tube('Cherry stem',[(.015+ .08*math.sin(i/20),.0,.245+i/20*.24) for i in range(21)],.009,stem_mat,sides=8,taper=True)
export('sweet-cherry',[berry,cherrystem])

# Poured chocolate: a pooled cap and varied radial runs, fitted to scoop surfaces.
def scoop_surface(x,y):
    return .44+.47*math.sqrt(max(.001,1-(x/.53)**2-(y/.51)**2))
verts=[];uv=[];faces=[];nr=16;na=96
for i in range(nr+1):
    u=i/nr
    for j in range(na):
        a=math.tau*j/na;r=u*(.30+.055*math.sin(3*a+.2)+.035*math.cos(7*a))
        x=r*math.cos(a);y=r*math.sin(a);z=scoop_surface(x,y)+.008
        verts.append((x,y,z));uv.append((.5+x,.5+y))
for i in range(nr):
    for j in range(na):
        k=i*na+j;kn=i*na+(j+1)%na;faces.append((k,kn,kn+na,k+na))
cap=mesh('Pooled hot fudge',verts,faces,fudge,uv)
mod=cap.modifiers.new('Poured sauce thickness','SOLIDIFY');mod.thickness=.009
bpy.context.view_layer.objects.active=cap;cap.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);cap.select_set(False)
fudges=[cap]
for k,a in enumerate([.13,.82,1.79,2.36,3.43,4.91,5.59]):
    pts=[];end=.41+.088*(.5+.5*math.sin(k*2.7))
    for i in range(42):
        r=.21+(end-.21)*i/41;aa=a+.035*math.sin(i/41*4+k)
        x=r*math.cos(aa);y=r*math.sin(aa);pts.append((x,y,scoop_surface(x,y)+.009))
    drip_radius=.024+.013*(.5+.5*math.sin(k*2))
    fudges.append(tube('Uneven poured fudge run',pts,drip_radius,fudge,sides=10,taper=False))
    fudges.append(sphere('Rounded sauce droplet',pts[-1],(drip_radius,drip_radius,drip_radius*.65),fudge,detail=16))
export('sweet-drizzle-scoop',fudges)
# Wavy crossing ribbons on the brownie or the uncovered drink surface.
flat=[]
for k in range(4):
    pts=[]
    for i in range(60):
        y=-.49+i/59*.98;x=(k-1.5)*.20+.045*math.sin(y*7+k*.7)+.012*math.sin(y*22+k)
        pts.append((x,y,.025))
    flat.append(tube('Chocolate finishing drizzle',pts,.015+.005*(k%2),fudge,sides=10,taper=True))
export('sweet-drizzle-flat',flat)
# Follow the actual piped cream envelope to avoid floating over or cutting through it.
cream_path=points[:]
def cream_surface(x,y):
    heights=[]
    q=1-(x*x+y*y)/(.37*.37)
    if q>=0:heights.append(.10+.10*math.sqrt(q))
    for i,p in enumerate(cream_path):
        rad=.135*max(.03,(1-i/(len(cream_path)-1))**.32)*1.17
        d=(x-p[0])**2+(y-p[1])**2
        if d<rad*rad:heights.append(p[2]+math.sqrt(rad*rad-d))
    return max(heights) if heights else None
cream_drips=[]
for k,a in enumerate([.25,2.15,3.9,5.2]):
    run=[]
    for i in range(48):
        r=.025+i/47*.375;aa=a+.07*math.sin(i/47*4+k);x=r*math.cos(aa);y=r*math.sin(aa);z=cream_surface(x,y)
        if z is not None:run.append((x,y,z+.006))
    if len(run)>3:cream_drips.append(tube('Chocolate over cream folds',run,.015+.004*(k%2),fudge,sides=10,taper=True))
export('sweet-drizzle-cream',cream_drips)
nuts=[]
for i in range(36):
    a=random.random()*math.tau;r=math.sqrt(random.random())*.48;x=r*math.cos(a);y=r*math.sin(a)
    obj=sphere('Chopped toasted almond',(x,y,scoop_surface(x,y)+.02),(.025+random.random()*.022,.02+random.random()*.01,.018),nut_mat,detail=8,noise=.2)
    nuts.append(obj)
export('sweet-nuts',nuts)
export('sweet-sundae-bowl',[lathe('Footed glass dessert bowl',[(.0001,0),(.54,0),(.56,.05),(.48,.1),(.13,.14),(.115,.38),(.38,.43),(.76,.67),(1.05,1.0),(1.07,1.045),(1.045,1.07),(1.016,1.04),(.72,.70),(.35,.49),(.0001,.48)],glass,128,flute=.007)])
export('sweet-plate',[lathe('Porcelain dessert plate',[(.0001,0),(1.2,0),(1.64,.055),(1.84,.11),(1.9,.16),(1.88,.19),(1.76,.19),(1.28,.09),(.0001,.08)],ceramic,128)])

pie=[wedge('Lower flaky pie crust',0,.10,pastry),wedge('Packed cinnamon apple filling',.10,.57,apple_texture)]
# Irregular soft slices emerge from the cut faces, nested into the filling volume.
for side in [-1,1]:
    for i in range(14):
        y=random.uniform(-.86,.94);half=max(.05,(y+1.05)*math.tan(.50));z=random.uniform(.19,.57)
        obj=sphere('Soft overlapping apple slice',(side*half*.98,y,z),(.045,random.uniform(.10,.19),random.uniform(.045,.085)),applemats[i%3],seed=i,detail=20,noise=.08)
        obj.rotation_euler.x=random.uniform(-.35,.35);pie.append(obj)
# A thin upper crust and a substantial crimped back edge retain a real pie silhouette.
pie.append(wedge('Flaky top crust',.67,.085,pastry))
for i in range(20):
    a=-.51+i/19*1.02;x=2.1*math.sin(a);y=2.1*math.cos(a)-1.05
    pie.append(sphere('Hand crimped pastry edge',(x,y,.73),(.10,.10,.09),pastry,detail=16,noise=.08))
export('sweet-apple-pie',pie)
cheesecake=[wedge('Graham crust',0,.14,crumb),wedge('Creamy cut cheesecake',.14,.67,cheesecake_mat)]
# Tiny naturally irregular crumb pieces at the cut base; baked geometry, not a noise paint.
for i in range(70):
    y=random.uniform(-1,.97);half=max(.025,(y+1.05)*math.tan(.50));x=random.choice([-1,1])*half
    cheesecake.append(sphere('Loose biscuit crumb',(x,y,random.uniform(.03,.13)),(.015,.017,.015),crumb,detail=8,noise=.2))
export('sweet-cheesecake',cheesecake)
compote=[]
for i in range(8):
    a=i*2.4;r=.18+.08*(i%3)
    compote.append(sphere('Cooked cherry',(r*math.cos(a),r*math.sin(a),.075),(.16,.14,.10),cherry_mat,seed=i,detail=32,noise=.045))
compote.append(sphere('Cherry compote pool',(0,0,.028),(.52,.44,.034),compote_mat,detail=64,noise=.08))
export('sweet-cherry-compote',compote)

body=rounded_box('Dense fudge brownie',(0,0,.25),(1.77,1.70,.44),brownie_side,.055)
# Closed top surface with fine organic relief and actual cracks at multiple scales.
verts=[];uv=[];faces=[];n=60
for j in range(n+1):
    y=-.84+1.68*j/n
    for i in range(n+1):
        x=-.87+1.74*i/n;z=.5+.011*noise_vector(Vector((x*19,y*19,8))).x+.006*math.sin(x*29+y*13)
        verts.append((x,y,z));uv.append((i/n,j/n))
for j in range(n):
    for i in range(n):
        a=j*(n+1)+i;faces.append((a,a+1,a+n+2,a+n+1))
top=mesh('Papery crackled brownie crust',verts,faces,brownie,uv)
mod=top.modifiers.new('Brownie crust thickness','SOLIDIFY');mod.thickness=.018
bpy.context.view_layer.objects.active=top;top.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);top.select_set(False)
export('sweet-brownie',[body,top])
pan=[lathe('Cast iron skillet',[(.0001,0),(1.12,0),(1.28,.06),(1.34,.20),(1.36,.29),(1.33,.32),(1.29,.29),(1.25,.12),(.0001,.11)],iron,128)]
for side in [-1,1]:
    pts=[(side*(1.25+.42*math.sin(math.pi*i/32)),.31*math.cos(math.pi*i/32),.23) for i in range(33)]
    pan.append(tube('Cast iron loop handle',pts,.065,iron,sides=10))
export('sweet-skillet',pan)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'dimensions.json').write_text(json.dumps(report,indent=2)+'\n')
(OUT/'provenance.json').write_text(json.dumps({'date':'2026-10-29','method':'Original authored Blender meshes with original built-in-chat-generated food surface maps and Blender-baked tangent normals. All ingredient GLBs are actual geometry, not image billboards.','script':'scripts/food-assets/sweet.py','source_textures':['textures/icecream-source.png','textures/pastry-source.png','textures/brownie-source.png','textures/crumb-source.png','textures/apple-source.png','textures/cheesecake-source.png'],'source_generation':'Built-in image_gen; no external paid services, no external food models, no gated model weights.','models':report},indent=2)+'\n')
print('SWEET_COMPLETE',len(report),flush=True)
