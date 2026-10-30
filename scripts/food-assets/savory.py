"""Original savory food: authored meshes + chat-created photographic material atlases.
Blender --background --python scripts/food-assets/savory.py
All output GLBs are Y-up, centered and bottom-aligned with applied transforms.
"""
from pathlib import Path
import bpy, math, random, json
from mathutils import Vector
from mathutils.noise import noise_vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/models/savory';TEX=OUT/'textures';SRC=OUT/'sources'
OUT.mkdir(parents=True,exist_ok=True);TEX.mkdir(exist_ok=True)
random.seed(2951)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=4
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='Standard'
scene.render.bake.margin=8;scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
manifest={'version':1,'ingredients':{}};receipts=[]

def n(x,y,z,s=15):return noise_vector(Vector((x*s+1.3,y*s-3.2,z*s+8.1))).x

def solid(name,col,rough=.65):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*col,1);b.inputs['Roughness'].default_value=rough;b.inputs['Specular IOR Level'].default_value=.27;return m

# Extract each original atlas quadrant through a real material bake, preserving sources.
def atlas_tile(file,name,column,row):
 image=bpy.data.images.load(str(SRC/file),check_existing=True)
 m=solid(name,(1,1,1));ns=m.node_tree.nodes;links=m.node_tree.links
 tex=ns.new('ShaderNodeTexImage');tex.image=image
 uv=ns.new('ShaderNodeUVMap');uv.uv_map='SourceUV';links.new(uv.outputs[0],tex.inputs['Vector']);links.new(tex.outputs[0],ns.get('Principled BSDF').inputs['Base Color'])
 bpy.ops.mesh.primitive_plane_add(size=2);p=bpy.context.object;p.data.materials.append(m)
 p.data.uv_layers.active.name='TargetUV';su=p.data.uv_layers.new(name='SourceUV')
 for loop in p.data.loops:
  co=p.data.vertices[loop.vertex_index].co;su.data[loop.index].uv=(column*.5+.015+(co.x+1)*.235,(1-row)*.5+.015+(co.y+1)*.235)
 p.data.uv_layers.active_index=0;p.data.uv_layers[0].active_render=True
 target=bpy.data.images.new(name,width=640,height=640,alpha=False)
 node=ns.new('ShaderNodeTexImage');node.image=target;ns.active=node
 bpy.ops.object.bake(type='DIFFUSE');target.filepath_raw=str(TEX/(name+'.jpg'));target.file_format='JPEG';target.save()
 bpy.data.objects.remove(p,do_unlink=True);bpy.data.materials.remove(m)
 return target
pancake_im=atlas_tile('savory-griddle-atlas.png','pancake-source',0,0)
toast_im=atlas_tile('savory-griddle-atlas.png','toast-source',1,0)
chicken_im=atlas_tile('savory-griddle-atlas.png','chicken-source',0,1)
potato_im=atlas_tile('savory-griddle-atlas.png','potato-source',1,1)
onion_im=atlas_tile('savory-vegetable-atlas.png','onion-source',0,0)
mush_im=atlas_tile('savory-vegetable-atlas.png','mushroom-source',1,0)
zuc_im=atlas_tile('savory-vegetable-atlas.png','zucchini-source',0,1)
avo_im=atlas_tile('savory-vegetable-atlas.png','avocado-source',1,1)
crumb_im=bpy.data.images.load(str(ROOT/'assets/models/burger-pilot/textures/core-crumb-albedo.jpg'),check_existing=True)
beef_im=bpy.data.images.load(str(ROOT/'assets/models/burger-pilot/textures/core-beef-albedo.jpg'),check_existing=True)
crust_im=bpy.data.images.load(str(ROOT/'assets/models/burger-pilot/textures/core-brioche-albedo.jpg'),check_existing=True)

def photo(name,image,rough=.65,tint=(1,1,1),density=.55,bump=.004):
 m=solid(name,tint,rough);ns=m.node_tree.nodes;links=m.node_tree.links;b=ns.get('Principled BSDF')
 tex=ns.new('ShaderNodeTexImage');tex.image=image;tex.projection='BOX';tex.projection_blend=.3
 tc=ns.new('ShaderNodeTexCoord');scale=ns.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs[3].default_value=density
 links.new(tc.outputs['Object'],scale.inputs[0]);links.new(scale.outputs[0],tex.inputs['Vector'])
 mix=ns.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*tint,1);links.new(tex.outputs[0],mix.inputs[1]);links.new(mix.outputs[0],b.inputs['Base Color'])
 bn=ns.new('ShaderNodeBump');bn.inputs['Strength'].default_value=.20;bn.inputs['Distance'].default_value=bump;links.new(tex.outputs[0],bn.inputs['Height']);links.new(bn.outputs[0],b.inputs['Normal'])
 return m
pc=photo('Pancake golden griddle',pancake_im,.78,(.95,.85,.66),.43,.004)
cut=photo('Fluffy crumb',crumb_im,.85,(1,.86,.62),.6,.005)
pc_side=photo('Pancake tender golden edge',crumb_im,.82,(.82,.65,.40),.75,.002)
toast=photo('Toasted sourdough',toast_im,.7,(1,.92,.79),.48,.006)
rye=photo('Toasted seeded rye',toast_im,.75,(.65,.46,.27),.48,.006)
crust=photo('Bread crust',crust_im,.62,(.75,.53,.28),.7,.004)
chicken=photo('Crisp chicken breading',chicken_im,.68,(.91,.68,.37),.85,.013)
potato=photo('Roasted potato',potato_im,.66,(1,.83,.55),1.7,.007)
onion=photo('Caramelized onion',onion_im,.46,(.74,.51,.27),.85,.004)
mush=photo('Cremini mushrooms',mush_im,.56,(.65,.48,.32),1.6,.006)
zuc=photo('Roasted zucchini flesh',zuc_im,.61,(.85,.85,.52),1.3,.004)
avo=photo('Avocado flesh',avo_im,.68,(.95,1,.84),1.2,.002)
pepper=photo('Roasted red pepper',mush_im,.42,(.85,.10,.025),1.4,.006)
sausage=photo('Browned sausage',beef_im,.52,(.94,.72,.50),1.1,.003)
skin=solid('Deep green peel',(.07,.14,.024),.70)
white=solid('Cooked egg white',(.89,.86,.75),.53);white_edge=solid('Egg browned edge',(.55,.29,.09),.70)
# Cooked whites have translucent gray valleys, opaque folds, and tiny blisters.
wn=white.node_tree.nodes;wl=white.node_tree.links;wb=wn.get('Principled BSDF')
wnoise=wn.new('ShaderNodeTexNoise');wnoise.inputs['Scale'].default_value=28;wnoise.inputs['Detail'].default_value=3
wr=wn.new('ShaderNodeValToRGB');wr.color_ramp.elements[0].position=.18;wr.color_ramp.elements[0].color=(.64,.61,.51,1);wr.color_ramp.elements[1].position=.72;wr.color_ramp.elements[1].color=(.96,.93,.83,1)
wl.new(wnoise.outputs['Fac'],wr.inputs[0]);wl.new(wr.outputs[0],wb.inputs['Base Color'])
wbump=wn.new('ShaderNodeBump');wbump.inputs['Strength'].default_value=.12;wbump.inputs['Distance'].default_value=.0015;wl.new(wnoise.outputs['Fac'],wbump.inputs['Height']);wl.new(wbump.outputs[0],wb.inputs['Normal'])
yolk=solid('Fresh egg yolk',(.95,.36,.015),.36)
ceramic=solid('Warm white ceramic',(.87,.88,.86),.23)
butter=solid('Butter',(.88,.69,.31),.43)
syrup=solid('Thin amber maple glaze',(.38,.13,.018),.28)
syrup_bsdf=syrup.node_tree.nodes.get('Principled BSDF')
syrup_bsdf.inputs['Alpha'].default_value=.55
syrup_bsdf.inputs['IOR'].default_value=1.44
syrup_bsdf.inputs['Specular IOR Level'].default_value=.18
syrup.surface_render_method='DITHERED'
blue=solid('Blueberry bloom',(.028,.045,.105),.64);blue_dark=solid('Blueberry blossom',(.012,.015,.028),.75)
choc=solid('Dark chocolate',(.070,.025,.012),.54)
cinnamon=solid('Cinnamon flecks',(.13,.045,.014),.9)
scramble_mats=[solid('Folded egg '+str(i),c,.56) for i,c in enumerate([(.91,.53,.075),(.95,.62,.14),(.86,.45,.045)])]


def mesh(name,verts,faces,mat):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 for p in data.polygons:p.use_smooth=True
 return o

def sphere(name,loc,scale,mat,segments=24,rings=12,rough=0):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat)
 for v in o.data.vertices:
  if rough:v.co *= 1+rough*n(v.co.x,v.co.y,v.co.z,9)
 for p in o.data.polygons:p.use_smooth=True
 return o

def cube(name,loc,scale,mat,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 mod=o.modifiers.new('Soft natural edge','BEVEL');mod.width=bevel;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in o.data.polygons:p.use_smooth=True
 return o

def radial(name,rad,height,mat,side=None,shape=None,detail=.002,segments=96,rings=20):
 verts=[];faces=[];mids=[]
 # Solid flattened dome top, rounded sides, and closed flat underside.
 profile=[(.001,1)] + [(k/rings,.91+.09*math.cos(k/rings*math.pi/2)) for k in range(1,rings+1)] + [(1.01,.72),(1.015,.4),(1,.13),(.97,.035)] + [(.97*(1-k/8),.02) for k in range(1,8)] + [(.001,.02)]
 for r,h in profile:
  for j in range(segments):
   a=j*2*math.pi/segments
   if shape:x,y=shape(a,r)
   else:
    rr=rad*r*(1+.015*math.sin(5*a+.7)+.009*math.sin(13*a));x,y=rr*math.cos(a),rr*math.sin(a)
   z=h*height+detail*n(x,y,h,25)
   verts.append((x,y,z))
 for k in range(len(profile)-1):
  for j in range(segments):
   faces.append((k*segments+j,(k+1)*segments+j,(k+1)*segments+(j+1)%segments,k*segments+(j+1)%segments));mids.append(1 if side and k>=rings else 0)
 faces.append(tuple(reversed(range(segments))));mids.append(0);start=(len(profile)-1)*segments;faces.append(tuple(start+j for j in range(segments)));mids.append(1 if side else 0)
 o=mesh(name,verts,faces,mat)
 if side:o.data.materials.append(side)
 for p,i in zip(o.data.polygons,mids):p.material_index=i
 return o

def ribbon(name,path,width,thick,mat):
 vs=[];fs=[]
 for i,p in enumerate(path):
  before=Vector(path[max(0,i-1)]);after=Vector(path[min(len(path)-1,i+1)]);d=(after-before).normalized();nrm=Vector((-d.y,d.x,0)).normalized()
  w=width*(.85+.14*math.sin(i*.7))
  for z in [-thick/2,thick/2]:
   for sign in [-1,1]:vs.append(tuple(Vector(p)+nrm*sign*w/2+Vector((0,0,z))))
 for i in range(len(path)-1):
  a=i*4;b=a+4;fs.extend([(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a,a+2,b+2,b),(a+1,b+1,b+3,a+3)])
 fs.extend([(0,1,3,2),(len(vs)-4,len(vs)-2,len(vs)-1,len(vs)-3)])
 return mesh(name,vs,fs,mat)

def soft_slice(name,path,width,thick,mat):
 vs=[];fs=[];sides=16
 for i,p in enumerate(path):
  t=i/(len(path)-1);before=Vector(path[max(0,i-1)]);after=Vector(path[min(len(path)-1,i+1)]);d=(after-before).normalized();normal=Vector((-d.y,d.x,0)).normalized()
  taper=.20+.80*math.sin(math.pi*t)**.35
  for j in range(sides):
   a=j*math.tau/sides;vs.append(tuple(Vector(p)+normal*math.cos(a)*width*.5*taper+Vector((0,0,math.sin(a)*thick*.5*taper))))
 for i in range(len(path)-1):
  for j in range(sides):fs.append((i*sides+j,(i+1)*sides+j,(i+1)*sides+(j+1)%sides,i*sides+(j+1)%sides))
 fs.extend([tuple(reversed(range(sides))),tuple((len(path)-1)*sides+j for j in range(sides))])
 return mesh(name,vs,fs,mat)


def bake(o,key,rough=.65):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.uv.smart_project(angle_limit=1.2,island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
 maps={}
 for kind in ['DIFFUSE','NORMAL']:
  im=bpy.data.images.new(key+'-'+kind,width=640,height=640,alpha=False)
  if kind=='NORMAL':im.colorspace_settings.name='Non-Color'
  active=[]
  for m in o.data.materials:
   node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;m.node_tree.nodes.active=node;active.append((m,node))
  bpy.ops.object.bake(type=kind);im.filepath_raw=str(TEX/(key+'-'+kind.lower()+('.jpg' if kind=='DIFFUSE' else '.png')));im.file_format='JPEG' if kind=='DIFFUSE' else 'PNG';im.save();maps[kind]=im
  for m,node in active:m.node_tree.nodes.remove(node)
 m=solid(key+' portable material',(1,1,1),rough);ns=m.node_tree.nodes;links=m.node_tree.links;b=ns.get('Principled BSDF')
 color=ns.new('ShaderNodeTexImage');color.image=maps['DIFFUSE'];links.new(color.outputs[0],b.inputs['Base Color'])
 norm=ns.new('ShaderNodeTexImage');norm.image=maps['NORMAL'];nm=ns.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.55;links.new(norm.outputs[0],nm.inputs['Color']);links.new(nm.outputs[0],b.inputs['Normal'])
 o.data.materials.clear();o.data.materials.append(m)
 for p in o.data.polygons:p.material_index=0


def export(key,objs,width,texture=True,rough=.65):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.hide_viewport=False;o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if len(objs)>1:bpy.ops.object.join()
 o=bpy.context.object;o.name=key
 vs=[v.co for v in o.data.vertices];mn=Vector(tuple(min(v[i] for v in vs) for i in range(3)));mx=Vector(tuple(max(v[i] for v in vs) for i in range(3)))
 center=Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z));factor=width/max(mx.x-mn.x,mx.y-mn.y)
 for v in o.data.vertices:v.co=(v.co-center)*factor
 h=(mx.z-mn.z)*factor
 if texture:bake(o,key,rough)
 o.data.update();bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 file=OUT/(key+'.glb');bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_image_format='AUTO',export_cameras=False,export_lights=False)
 manifest['ingredients'][key]={'url':'./'+key+'.glb','width':width,'height':h}
 receipts.append({'asset':key,'height':h,'width':width,'bytes':file.stat().st_size,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)})
 print('SAVORY_ASSET',key,h,file.stat().st_size,flush=True)
 bpy.data.objects.remove(o,do_unlink=True)

# Ceramic dish: shallow center, raised glazed rim and foot; distinct from food.
profile=[(.001,.055),(1.5,.055),(1.75,.065),(1.96,.13),(2.16,.17),(2.30,.16),(2.31,.13),(2.17,.10),(1.94,.065),(1.66,.025),(.001,.025)]
v=[];f=[]
for r,z in profile:
 for j in range(96):a=j*math.tau/96;v.append((r*math.cos(a),r*math.sin(a),z))
for k in range(len(profile)-1):
 for j in range(96):f.append((k*96+j,(k+1)*96+j,(k+1)*96+(j+1)%96,k*96+(j+1)%96))
f.extend([tuple(reversed(range(96))),tuple((len(profile)-1)*96+j for j in range(96))])
export('savory-plate',[mesh('Plate',v,f,ceramic)],4.6,False)

# Toast slices have rounded loaf shoulders, actual thickness and separate toasted crust.
def loaf(a,r):
 x=1.14*math.copysign(abs(math.cos(a))**.45,math.cos(a))*r
 y=.91*math.copysign(abs(math.sin(a))**.48,math.sin(a))*r
 if math.sin(a)>0:y+=.10*(1-(x/1.15)**2)*r
 return x,y
for key,mat,h in [('savory-sourdough',toast,.25),('savory-rye',rye,.25),('savory-french-toast',toast,.36)]:
 export(key,[radial(key,1.2,h,mat,crust,loaf,.004)],2.4,True,.72)
def pancake_outline(a,r):
 rr=1.2*r*(1+.022*math.sin(3*a+.8)+.012*math.sin(8*a)+.005*math.sin(17*a))
 return rr*math.cos(a),rr*math.sin(a)
pan=radial('Hand poured pancake',1.2,.185,pc,pc_side,pancake_outline,detail=.005)
for v in pan.data.vertices:
 v.co.z+=.004*math.sin(v.co.x*8.5+.7)*math.cos(v.co.y*7.3)
export('savory-pancake',[pan],2.4,True,.78)

# Fried chicken breast: asymmetrical crags, no perfect cylinder or regular grill lines.
o=sphere('Chicken breast',(0,0,.2),(1.02,.88,.22),chicken,64,32,.065)
objects=[o]
for i in range(95):
 a=random.uniform(0,math.tau);r=math.sqrt(random.random());x=1.02*r*math.cos(a);y=.88*r*math.sin(a);z=.22+.18*math.sqrt(max(0,1-r*r))
 s=random.uniform(.028,.07);objects.append(sphere('Crispy breading',(x,y,z),(s,s*.8,s*.65),chicken,8,4,.14))
export('savory-crispy-chicken',objects,2.3,True,.69)

# Tender caramelized onion ribbons.
objects=[]
for i in range(20):
 a=random.uniform(0,6.28);cx=random.uniform(-.55,.55);cy=random.uniform(-.5,.5);r=random.uniform(.23,.58)
 path=[(cx+r*math.cos(a+j*.09),cy+r*.7*math.sin(a+j*.09),.035+i%4*.025+.018*math.sin(j*.6)) for j in range(25)]
 objects.append(ribbon('Onion ribbon',path,random.uniform(.045,.09),.016,onion))
export('savory-caramelized-onion',objects,2.12,True,.48)

# Sliced cremini mushrooms, cap + stem, laid naturally across a small mound.
objects=[]
for i in range(7):
 a=i*2.4;cx=.58*math.cos(a);cy=.45*math.sin(a);z=.055+i%3*.03
 cap=sphere('Mushroom cap',(cx,cy,z+.055),(.28,.19,.065),mush,24,12,.05);cap.rotation_euler.z=a;objects.append(cap)
 st=cube('Mushroom stem',(cx-.1*math.sin(a),cy+.1*math.cos(a),z),(.11,.29,.06),cut,.025);st.rotation_euler.z=a;objects.append(st)
export('savory-mushroom',objects,2.05,True,.60)
objects=[]
for i in range(8):
 a=i*1.7;cx=.4*math.cos(a);cy=.35*math.sin(a)
 path=[(cx+(j/20-.5)*1.1*math.cos(a),cy+(j/20-.5)*1.1*math.sin(a),.05+i%3*.028+.045*math.sin(j/20*math.pi)) for j in range(21)]
 objects.append(ribbon('Roasted pepper strip',path,.20,.045,pepper))
export('savory-pepper',objects,2.12,True,.48)
objects=[]
for i in range(7):
 a=i*2.3;cx=.6*math.cos(a);cy=.52*math.sin(a)
 o=radial('Zucchini slice',.34,.09,zuc,skin,detail=.002,segments=48,rings=8);o.location=(cx,cy,.02+i%3*.035);o.rotation_euler=(random.uniform(-.1,.1),random.uniform(-.1,.1),a);objects.append(o)
export('savory-zucchini',objects,2.12,True,.64)
# Avocado crescents are curved pieces, individually fanned.
objects=[]
for i in range(5):
 a0=-1.0+i*.08;path=[(.62*math.cos(a0+j/30*2.5)+i*.13-.6,.48*math.sin(a0+j/30*2.5)+i*.04,.08+i*.012+.01*math.sin(j*.2)) for j in range(31)]
 objects.append(soft_slice('Tapered avocado crescent',path,.24,.14,avo))
export('savory-avocado',objects,1.65,True,.69)

export('savory-butter',[cube('Butter pat',(0,0,.055),(.46,.38,.11),butter,.026)],.46,False)
def syrup_outline(a,r):
 rr=.85*r*(1+.15*math.sin(3*a+.6)+.075*math.sin(5*a+1.4)+.035*math.sin(9*a))
 return rr*math.cos(a),.91*rr*math.sin(a)
export('savory-syrup',[radial('Irregular translucent syrup coating',.92,.008,syrup,shape=syrup_outline,detail=.0002,segments=112,rings=12)],1.86,False)
objects=[]
for i in range(15):
 a=i*2.399;r=.43*math.sqrt((i+.5)/15);x=r*math.cos(a);y=r*math.sin(a);sz=random.uniform(.085,.12);z=sz+.035*(i%2)
 objects.append(sphere('Blueberry',(x,y,z),(sz,sz*.94,sz),blue,20,10,.025))
 for j in range(5):
  aa=j*math.tau/5;objects.append(sphere('Blossom scar',(x+.024*math.cos(aa),y+.024*math.sin(aa),z+sz*.95),(.019,.009,.005),blue_dark,8,4))
export('savory-blueberries',objects,1.15,False)
objects=[]
for i in range(23):
 a=i*2.399;r=.6*math.sqrt((i+.5)/23);x=r*math.cos(a);y=r*math.sin(a)
 o=radial('Chocolate chip',.06,.09,choc,detail=0,segments=16,rings=8)
 for v in o.data.vertices:
  t=v.co.z/.09;v.co.x*=1-t*.8;v.co.y*=1-t*.8;v.co.x+=t*t*.02
 o.location=(x,y,0);objects.append(o)
export('savory-chocolate-chips',objects,1.35,False)

# Sunny egg with an uneven browned white edge and smooth natural yolk dome.
def eggoutline(a,r):
 rr=(1+.09*math.sin(3*a+.8)+.042*math.sin(7*a)+.015*math.sin(21*a+.4)+.006*math.sin(47*a))
 return .79*r*rr*math.cos(a),.60*r*rr*math.sin(a)
wh=radial('Frilled fried egg white',.8,.035,white,white_edge,eggoutline,.0025,segments=160,rings=32)
for v in wh.data.vertices:
 r=math.sqrt((v.co.x/.79)**2+(v.co.y/.60)**2);a=math.atan2(v.co.y,v.co.x)
 if v.co.z>.01:
  v.co.z+=.006*math.sin(v.co.x*12)*math.cos(v.co.y*15)+.012*max(0,r-.67)*math.sin(24*a)
yo=sphere('Yolk',(.04,-.035,.043),(.30,.285,.16),yolk,48,24,.009)
# The underside is flattened into the white, preventing a hidden full sphere
# from lifting the egg white off the plate when normalized by its bounds.
for v in yo.data.vertices:
 if v.co.z<0:v.co.z*=.08
 v.co.x+=.022*v.co.z*math.sin(v.co.y*4)
egg_objects=[wh,yo]
for i in range(42):
 a=i*2.399;r=random.uniform(.64,.94);x,y=eggoutline(a,r);s=random.uniform(.012,.035)
 egg_objects.append(sphere('Cooked white blister',(x,y,.031),(s,s*.75,s*.28),white,12,6,.10))
for i in range(34):
 a=i*math.tau/34+.08*random.random();x,y=eggoutline(a,.987)
 o=sphere('Golden lace at egg edge',(x,y,.014),(.026,.009,.005),white_edge,10,5,.09);o.rotation_euler.z=a+math.pi/2;egg_objects.append(o)
export('savory-egg-sunny',egg_objects,1.65,True,.48)
objects=[]
for i in range(26):
 a=i*2.4;r=.53*math.sqrt((i+.5)/26);sx=random.uniform(.19,.28);sy=random.uniform(.11,.17);phase=i*.75
 def fold_outline(angle,rad):
  irregular=1+.14*math.sin(3*angle+phase)+.06*math.sin(7*angle-phase)
  return sx*rad*math.cos(angle)*irregular,sy*rad*math.sin(angle)*irregular
 o=radial('Soft scrambled egg curd',.2,.11,scramble_mats[i%3],shape=fold_outline,detail=.004,segments=40,rings=10)
 for v in o.data.vertices:
  if v.co.z>.035:v.co.z+=.028*math.sin(v.co.x/sx*4+phase)+.014*math.cos(v.co.y/sy*6)
 o.location=(r*math.cos(a),r*.70*math.sin(a),.018+i%3*.035);o.rotation_euler.z=a;objects.append(o)
export('savory-eggs-scrambled',objects,1.65,True,.58)
objects=[]
for i in range(3):
 vs=[];fs=[];segments=32;rings=28
 for k in range(rings+1):
  y=-.58+k/rings*1.16;end=max(0,(abs(y)-.39)/.19);rr=.145*math.sqrt(max(.004,1-end*end))
  for j in range(segments):
   a=j*math.tau/segments;rrj=rr*(1+.018*math.sin(a*5+k*.7));vs.append((rrj*math.cos(a)+.012*math.sin(y*4),y,rrj*.87*math.sin(a)+.13))
 for k in range(rings):
  for j in range(segments):fs.append((k*segments+j,(k+1)*segments+j,(k+1)*segments+(j+1)%segments,k*segments+(j+1)%segments))
 fs.extend([tuple(reversed(range(segments))),tuple(rings*segments+j for j in range(segments))])
 o=mesh('Rounded breakfast sausage',vs,fs,sausage);o.location=(-.34+i*.34,0,0);o.rotation_euler.z=.18*(i-1);objects.append(o)
export('savory-sausage',objects,1.45,True,.54)
objects=[]
for i in range(19):
 a=i*2.399;r=.58*math.sqrt((i+.5)/19);sz=random.uniform(.19,.29);o=cube('Breakfast potato',(r*math.cos(a),r*math.sin(a),.13+(.09 if i<5 else 0)),(sz,sz*.85,sz*.72),potato,.025)
 o.rotation_euler=(random.uniform(-.20,.20),random.uniform(-.20,.20),a);objects.append(o)
export('savory-potato',objects,1.48,True,.69)
objects=[]
for i in range(380):
 x=random.uniform(-.95,.95);y=random.uniform(-.72,.72)
 o=sphere('Cinnamon dust',(x,y,.003),(.004,.004,.002),cinnamon,6,3);objects.append(o)
export('savory-cinnamon',objects,1.95,False)

(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'provenance.json').write_text(json.dumps({'method':'Original chat-generated food atlases and authored Blender geometry, locally baked/exported. No Hugging Face, downloaded food models, or paid generation API.','source_atlases':['sources/savory-griddle-atlas.png','sources/savory-vegetable-atlas.png'],'reused_original_sources':['burger-pilot/textures/core-crumb-albedo.jpg','burger-pilot/textures/core-beef-albedo.jpg','burger-pilot/textures/core-brioche-albedo.jpg'],'assets':receipts},indent=2)+'\n')
print('SAVORY_COMPLETE',len(receipts),flush=True)
