"""Original modular sides. Blender 4.5; no external food models or AI runtimes."""
import bpy, math, random, json, sys, re
from pathlib import Path
from mathutils import Vector, Euler
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'assets/models/sides'; TEX=OUT/'textures'
TAU=math.tau; random.seed(713)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def mesh(name,verts,faces,uv=None,mat=None):
 d=bpy.data.meshes.new(name); d.from_pydata(verts,[],faces); d.update(); o=bpy.data.objects.new(name,d); bpy.context.collection.objects.link(o)
 if uv:
  layer=d.uv_layers.new(name='UVMap')
  for p in d.polygons:
   for i in p.loop_indices: layer.data[i].uv=uv[d.loops[i].vertex_index]
 for p in d.polygons:p.use_smooth=True
 if mat:d.materials.append(mat)
 return o

def mat(name,color=(.5,.5,.5,1),rough=.45,image=None,normal=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.28
 if image:
  a=n.new('ShaderNodeTexImage');a.image=bpy.data.images.load(str(image),check_existing=True);l.new(a.outputs['Color'],p.inputs['Base Color'])
 if normal:
  a=n.new('ShaderNodeTexImage');a.image=bpy.data.images.load(str(normal),check_existing=True);a.image.colorspace_settings.name='Non-Color';b=n.new('ShaderNodeNormalMap');b.inputs['Strength'].default_value=.42;l.new(a.outputs['Color'],b.inputs['Color']);l.new(b.outputs['Normal'],p.inputs['Normal'])
 return m

def food_texture(source,stem,strength=.12,distance=.015):
 color=TEX/(stem+'.jpg');normal=TEX/(stem+'-normal.png')
 if not color.exists():
  image=bpy.data.images.load(str(source),check_existing=True);image.scale(1024,1024);image.filepath_raw=str(color);image.file_format='JPEG';image.save()
 if not normal.exists():
  m=mat('Bake '+stem,image=color);n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');source=next(a for a in n if a.type=='TEX_IMAGE')
  b=n.new('ShaderNodeBump');b.inputs['Strength'].default_value=strength;b.inputs['Distance'].default_value=distance;l.new(source.outputs['Color'],b.inputs['Height']);l.new(b.outputs['Normal'],p.inputs['Normal'])
  target=bpy.data.images.new(stem+' normal',512,512,alpha=False);target.colorspace_settings.name='Non-Color';a=n.new('ShaderNodeTexImage');a.image=target;n.active=a
  o=mesh('Bake plane',[(-1,-1,0),(1,-1,0),(1,1,0),(-1,1,0)],[(0,1,2,3)],[(0,0),(1,0),(1,1),(0,1)],m)
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=1;s.cycles.device='CPU';s.render.bake.margin=8;bpy.ops.object.bake(type='NORMAL')
  target.filepath_raw=str(normal);target.file_format='PNG';target.save();bpy.data.objects.remove(o,do_unlink=True)
 return color,normal

fried=food_texture(OUT/'source/fried-surface-atlas.png','fried-atlas')
chili_tex=food_texture(OUT/'source/chili-surface.png','chili')
cheddar_tex=food_texture(ROOT/'assets/models/burger-pilot/textures/topping-cheddar-color.png','cheddar',.06,.005)
bacon_tex=food_texture(ROOT/'assets/models/burger-pilot/textures/topping-bacon-color.png','bacon',.12,.016)
pickle_tex=food_texture(ROOT/'assets/models/burger-pilot/textures/topping-pickle-color.png','pickle',.1,.008)
potato=food_texture(OUT/'source/fried-potato-v2.png','potato-v2',.08,.008)
frie_mat=mat('Golden crisp potato',rough=.62,image=potato[0],normal=potato[1]);crumb_mat=mat('Crunchy golden breadcrumb coating',rough=.62,image=fried[0],normal=fried[1])
chili_mat=mat('Slow cooked chili',rough=.44,image=chili_tex[0],normal=chili_tex[1])
cheese_mat=mat('Melted cheddar',rough=.39,image=cheddar_tex[0],normal=cheddar_tex[1])
bacon_mat=mat('Crisp bacon garnish',rough=.46,image=bacon_tex[0],normal=bacon_tex[1])
pickle_mat=mat('Pickle interior',rough=.44,image=pickle_tex[0],normal=pickle_tex[1])
ceramic=mat('Warm white glazed diner ceramic',(.85,.83,.78,1),.24)
bean_mat=mat('Red kidney beans',(.18,.032,.018,1),.39)
onion_mat=mat('Chopped white onion',(.87,.82,.69,1),.48)
ranch_mat=mat('Cultured ranch dip',(.87,.82,.67,1),.48)
house_mat=mat('House dip',(.58,.29,.105,1),.46)
herb_mat=mat('Dill and parsley',(.055,.13,.018,1),.69)
salt_mat=mat('Small salt crystals',(.9,.9,.83,1),.58)

def apply(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);o.select_set(False)

def blob(name,pos,scale,material,seed=0,subdiv=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv,radius=1,location=pos);o=bpy.context.object;o.name=name
 for v in o.data.vertices:
  p=v.co;f=1+.09*math.sin(p.x*13+p.y*7+seed)*math.sin(p.z*11-seed);v.co*=f
 o.scale=scale;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 # Project tiny irregular particles to a cropped texture area.
 layer=o.data.uv_layers.new(name='UVMap')
 for p in o.data.polygons:
  for i in p.loop_indices:
   v=o.data.vertices[o.data.loops[i].vertex_index].co;layer.data[i].uv=(.52+.46*(v.x+1)/2,.04+.92*(v.y+1)/2)
 apply(o);return o

def lathe(name,profile,material,segments=96):
 v=[];uv=[];f=[]
 for i,(r,z) in enumerate(profile):
  for j in range(segments):
   t=j/segments*TAU;v.append((r*math.cos(t),r*math.sin(t),z));uv.append((j/segments,i/(len(profile)-1)))
 for i in range(len(profile)-1):
  for j in range(segments):
   a=i*segments+j;b=i*segments+(j+1)%segments;f.append((a+segments,b+segments,b,a))
 return mesh(name,v,f,uv,material)

def plate():
 return [lathe('White diner plate',[(.001,.035),(.85,.035),(1.12,.045),(1.36,.10),(1.47,.18),(1.50,.17),(1.47,.12),(1.34,.055),(1.06,.018),(.001,.018)],ceramic)]

def bowl():
 return [lathe('Glazed macaroni bowl',[(.001,.13),(.63,.13),(.83,.18),(1.05,.39),(1.18,.65),(1.23,.69),(1.27,.68),(1.26,.62),(1.12,.31),(.85,.08),(.66,.03),(.001,.03)],ceramic)]

def ramekin():
 return [lathe('Dipping ramekin',[(.001,.04),(.22,.04),(.28,.09),(.32,.30),(.345,.32),(.36,.31),(.35,.28),(.30,.04),(.24,.015),(.001,.015)],ceramic,64)]

def fry_specs(large=False):
 rng=random.Random(62);specs=[]
 for k in range(46 if large else 32):
  t=rng.random()*TAU;r=(rng.random()**.5)*(.71 if large else .59);layer=k//10
  specs.append((r*math.cos(t),r*math.sin(t),rng.random()*TAU,1.12+rng.random()*.72,.11+rng.random()*.025,.045+layer*.095,rng.random()*TAU))
 return specs

def fries_height(x,y,large=False):
 best=.095
 for cx,cy,a,length,w,z,phase in fry_specs(large):
  dx=x-cx;dy=y-cy;u=dx*math.cos(a)+dy*math.sin(a);v=-dx*math.sin(a)+dy*math.cos(a)
  distance=math.hypot(max(abs(u)-w*.55,0),max(abs(v)-length*.5,0))
  best=max(best,z+.064+.025*math.sin(max(-.5,min(.5,v/length))*9+phase)-distance*.72)
 return best

def fry(name,spec):
 cx,cy,a,length,w,z,phase=spec;verts=[];uv=[];faces=[];segments=16;around=8
 for j in range(segments+1):
  t=j/segments;y=(t-.5)*length
  for q in range(around):
   theta=TAU*q/around+math.pi/8
   # Rounded square, lightly curved and tapered at its cut ends.
   taper=.84+.16*math.sin(math.pi*t)**.3
   xx=math.copysign(abs(math.cos(theta))**.55,math.cos(theta))*w*.55*taper
   zz=math.copysign(abs(math.sin(theta))**.55,math.sin(theta))*w*.46*taper
   xx+=.018*math.sin(t*7+phase);zz+=.025*math.sin(t*9+phase)+.004*math.sin(t*61+q*3)
   verts.append((cx+xx*math.cos(a)-y*math.sin(a),cy+xx*math.sin(a)+y*math.cos(a),z+zz))
   uv.append((.15*math.sin(phase)+.37*q/(around-1),phase*.13+1.8*t))
 for j in range(segments):
  for q in range(around):
   a0=j*around+q;b=j*around+(q+1)%around;faces.append((a0,a0+around,b+around,b))
 faces.append(tuple(range(around)));faces.append(tuple(segments*around+q for q in range(around-1,-1,-1)))
 return mesh(name,verts,faces,uv,frie_mat)

def fries(large=False):
 objects=[fry('Hand cut fry '+str(i),s) for i,s in enumerate(fry_specs(large))]
 rng=random.Random(119)
 for k in range(42 if large else 30):
  s=fry_specs(large)[k%len(fry_specs(large))];x,y=s[:2];objects.append(blob('Salt grain',(x,y,fries_height(x,y,large)+.002),(.007,.005,.006),salt_mat,k,1))
 return objects

def surface(name,radius,material,height_fn,seed=3,thickness=.025):
 verts=[(0,0,height_fn(0,0))];uv=[(.5,.5)];faces=[];n=80;rings=20
 for j in range(1,rings+1):
  for q in range(n):
   t=TAU*q/n;r=radius*j/rings*(1+.027*math.sin(t*7+seed)+.018*math.sin(t*13));x=r*math.cos(t);y=r*math.sin(t)
   verts.append((x,y,height_fn(x,y)));uv.append((.5+x/(radius*2.1),.5+y/(radius*2.1)))
 for q in range(n):faces.append((0,1+q,1+(q+1)%n))
 for j in range(rings-1):
  for q in range(n):
   a=1+j*n+q;b=1+j*n+(q+1)%n;faces.append((a,a+n,b+n,b))
 o=mesh(name,verts,faces,uv,material)
 mod=o.modifiers.new('Sauce thickness','SOLIDIFY');mod.thickness=thickness;mod.offset=-1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def chili(large=False):
 scale=1.13 if large else 1
 height=lambda x,y:fries_height(x,y,large)+.018+.015*math.sin(x*19)*math.sin(y*21)
 objects=[surface('Thick chili across fries',.84*scale,chili_mat,height,12,.038)]
 rng=random.Random(44)
 for k in range(22):
  t=rng.random()*TAU;r=.77*scale*rng.random()**.5;x,y=r*math.cos(t),r*math.sin(t);z=height(x,y)+.035
  o=blob('Kidney bean',(x,y,z),(.055,.105,.045),bean_mat,k,2);o.rotation_euler.z=rng.random()*TAU;apply(o);objects.append(o)
 for k in range(30):
  t=rng.random()*TAU;r=.75*scale*rng.random()**.5;x,y=r*math.cos(t),r*math.sin(t);objects.append(blob('Tender beef crumble',(x,y,height(x,y)+.018),(.045,.055,.033),chili_mat,k,1))
 return objects

def cheese_fries(large=False,over_chili=False):
 objects=[];size=1.13 if large else 1
 # Unequal soft pools drape over adjacent fries. Their lobed edges and
 # asymmetrical coverage resemble melted cheddar, not parallel cut strips.
 patches=[(-.47,-.39,.28,.37,.5),(.32,-.41,.39,.23,-.6),(-.03,.08,.34,.32,.3),(-.44,.48,.22,.30,-.3),(.45,.41,.29,.35,.8)]
 support=lambda x,y:fries_height(x,y,large)+(.040 if over_chili else .012)
 for k,(cx,cy,rx,ry,a) in enumerate(patches):
  cx*=size;cy*=size;rx*=size;ry*=size;n=64;rings=12;v=[(cx,cy,support(cx,cy)+.008)];uv=[(.5,.5)];f=[]
  for j in range(1,rings+1):
   for q in range(n):
    t=q/n*TAU;r=j/rings;edge=1+.13*math.sin(t*3+k*2)+.08*math.sin(t*7-k)
    xx=rx*r*edge*math.cos(t);yy=ry*r*edge*math.sin(t);x=cx+xx*math.cos(a)-yy*math.sin(a);y=cy+xx*math.sin(a)+yy*math.cos(a)
    v.append((x,y,support(x,y)+.008*(1-r*r)));uv.append((.5+xx/(rx*2.6),.5+yy/(ry*2.6)))
  for q in range(n):f.append((0,1+q,1+(q+1)%n))
  for j in range(rings-1):
   for q in range(n):
    aa=1+j*n+q;bb=1+j*n+(q+1)%n;f.append((aa,aa+n,bb+n,bb))
  o=mesh('Irregular melted cheddar pool '+str(k),v,f,uv,cheese_mat);mod=o.modifiers.new('Thin flowing cheese','SOLIDIFY');mod.thickness=.016;mod.offset=-.8;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name);objects.append(o)
 # Two thin, curved runoffs connect selected pools and taper to soft ends.
 for k,(x0,y0,x1,y1) in enumerate([(-.40,-.49,.05,-.15),(.38,.33,.73,.67)]):
  v=[];uv=[];f=[]
  for j in range(37):
   t=j/36;x=(x0*(1-t)+x1*t+.075*math.sin(t*math.pi*2))*size;y=(y0*(1-t)+y1*t)*size;width=(.010+.043*math.sin(math.pi*t)**.45)*size
   for q in [0,1]:
    xx=x+(q-.5)*width;v.append((xx,y,support(xx,y)+.006));uv.append((.3+q*.3,t))
  for j in range(36):aa=j*2;f.append((aa,aa+1,aa+3,aa+2))
  o=mesh('Tapered cheddar runoff '+str(k),v,f,uv,cheese_mat);mod=o.modifiers.new('Cheese runoff thickness','SOLIDIFY');mod.thickness=.010;mod.offset=-.8;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name);objects.append(o)
 return objects

def onion_garnish(large=False,over_chili=False):
 objects=[];rng=random.Random(5)
 for k in range(24):
  t=rng.random()*TAU;r=(.85 if large else .75)*rng.random()**.5;x,y=r*math.cos(t),r*math.sin(t);objects.append(blob('Fresh chopped onion',(x,y,fries_height(x,y,large)+(.055 if over_chili else .018)),(.025,.035,.022),onion_mat,k,1))
 return objects

def spear():
 verts=[];uv=[];faces=[];n=32;around=12
 for j in range(n+1):
  t=j/n;y=(t-.5)*1.67;end=.35+.65*math.sin(math.pi*t)**.2
  for q in range(around):
   a=TAU*q/around;x=.17*math.cos(a)*end;z=.12*math.sin(a)*end
   noise=.008*math.sin(j*6+q*9)+.005*math.cos(j*11-q*5)
   verts.append((x*(1+noise*5),y,z+noise));uv.append((.52+.46*q/(around-1),.02+.96*t))
 for j in range(n):
  for q in range(around):
   a=j*around+q;b=j*around+(q+1)%around;faces.append((a,a+around,b+around,b))
 faces.append(tuple(range(around)));faces.append(tuple(n*around+q for q in range(around-1,-1,-1)))
 o=mesh('Breaded fried pickle spear',verts,faces,uv,crumb_mat);o.data.materials.append(pickle_mat)
 for p in o.data.polygons[-2:]:
  p.material_index=1
  for i in p.loop_indices:
   co=o.data.vertices[o.data.loops[i].vertex_index].co;o.data.uv_layers.active.data[i].uv=(.5+co.x/.37,.5+co.z/.27)
 return [o]

def dip(kind):
 m=ranch_mat if kind=='ranch' else house_mat
 objects=[surface('Smooth '+kind+' dip',.285,m,lambda x,y:.015+.004*math.sin(x*15+y*9),7,.018)]
 if kind=='ranch':
  rng=random.Random(7)
  for k in range(18):
   t=rng.random()*TAU;r=.24*rng.random()**.5;objects.append(blob('Ranch herb',(r*math.cos(t),r*math.sin(t),.021),(.006,.012,.002),herb_mat,k,1))
 return objects

def elbow(name,center,rotation,seed):
 verts=[];uv=[];faces=[];arc=12;cross=8;bend=.13;span=2.15
 for side,r in enumerate([.065,.042]):
  for j in range(arc+1):
   t=-span/2+span*j/arc
   for q in range(cross):
    a=TAU*q/cross;rr=r*(1+.045*math.sin(t*7+q*3+seed));verts.append(((bend+rr*math.cos(a))*math.cos(t)-.07,(bend+rr*math.cos(a))*math.sin(t),rr*math.sin(a)));uv.append((j/arc,q/cross))
 stride=(arc+1)*cross
 for side in [0,1]:
  for j in range(arc):
   for q in range(cross):
    a=side*stride+j*cross+q;b=side*stride+j*cross+(q+1)%cross;f=(a,b,b+cross,a+cross);faces.append(f if side==0 else f[::-1])
 for end in [0,arc]:
  for q in range(cross):
   a=end*cross+q;b=end*cross+(q+1)%cross;f=(a,a+stride,b+stride,b);faces.append(f if end==0 else f[::-1])
 o=mesh(name,verts,[f[::-1] for f in faces],uv,cheese_mat);o.location=center;o.rotation_euler=rotation;apply(o);return o

def macaroni():
 objects=[];rng=random.Random(127)
 objects.append(surface('Creamy cheddar base',1.01,cheese_mat,lambda x,y:.08+.04*(1-x*x-y*y),9,.055))
 k=0
 # Dense staggered layers make a supported, full serving. The upper layer
 # tapers toward the bowl edges; no isolated random noodles are placed in air.
 for layer in range(3):
  for row in range(-4,5):
   for col in range(-4,5):
    x=col*.225+(row%2)*.1125+rng.uniform(-.04,.04)
    y=row*.20+rng.uniform(-.035,.035)
    r=math.hypot(x,y)
    if r>(.88 if layer<2 else .63):continue
    z=.145+layer*.098+.022*(1-r)
    rotation=(rng.uniform(-.22,.22),rng.uniform(-.22,.22),rng.random()*TAU)
    objects.append(elbow('Hollow elbow macaroni '+str(k),(x,y,z),rotation,k));k+=1
 return objects

def macaroni_bvh():
 objects=macaroni();verts=[];faces=[]
 for o in objects:
  offset=len(verts);verts.extend([o.matrix_world@v.co for v in o.data.vertices]);faces.extend([tuple(offset+i for i in p.vertices) for p in o.data.polygons])
 tree=BVHTree.FromPolygons(verts,faces)
 for o in objects:bpy.data.objects.remove(o,do_unlink=True)
 return tree

def garnish_z(tree,x,y):
 location,_,_,_=tree.ray_cast(Vector((x,y,2)),Vector((0,0,-1)))
 return location.z+.004 if location else .10

def crumb_garnish():
 objects=[];rng=random.Random(99);tree=macaroni_bvh()
 for k in range(80):
  t=rng.random()*TAU;r=.93*rng.random()**.5;x,y=r*math.cos(t),r*math.sin(t);objects.append(blob('Toasted breadcrumb',(x,y,garnish_z(tree,x,y)),(.012+rng.random()*.018,.016+rng.random()*.013,.011+rng.random()*.012),crumb_mat,k,1))
 return objects

def bacon_garnish():
 objects=[];rng=random.Random(91);tree=macaroni_bvh()
 for k in range(24):
  t=rng.random()*TAU;r=.88*rng.random()**.5;x,y=r*math.cos(t),r*math.sin(t);o=blob('Crisp bacon piece',(x,y,garnish_z(tree,x,y)),(.035,.065,.014),bacon_mat,k,1);o.rotation_euler.z=rng.random()*TAU;apply(o);objects.append(o)
 return objects

def export(name,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.join();o=bpy.context.object;apply(o);o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);bpy.context.view_layer.update();o.data.calc_loop_triangles()
 corners=[o.matrix_world@Vector(c) for c in o.bound_box];low=[min(p[i] for p in corners) for i in range(3)];high=[max(p[i] for p in corners) for i in range(3)];size=[high[i]-low[i] for i in range(3)]
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_image_format='AUTO',export_materials='EXPORT',export_cameras=False,export_lights=False)
 r={'url':'./'+name+'.glb','width':max(size[:2]),'height':size[2],'boundsMin':low,'boundsMax':high,'triangles':len(o.data.loop_triangles),'bytes':(OUT/(name+'.glb')).stat().st_size}
 bpy.data.objects.remove(o,do_unlink=True);print('EXPORTED',name,json.dumps(r),flush=True);return r

builders={'sides-plate':plate,'sides-bowl':bowl,'sides-ramekin':ramekin,'sides-fries':lambda:fries(False),'sides-fries-large':lambda:fries(True),'sides-chili':lambda:chili(False),'sides-chili-large':lambda:chili(True),'sides-cheese':lambda:cheese_fries(False,False),'sides-cheese-large':lambda:cheese_fries(True,False),'sides-cheese-chili':lambda:cheese_fries(False,True),'sides-cheese-chili-large':lambda:cheese_fries(True,True),'sides-onion':onion_garnish,'sides-onion-large':lambda:onion_garnish(True,False),'sides-onion-chili':lambda:onion_garnish(False,True),'sides-onion-chili-large':lambda:onion_garnish(True,True),'sides-pickle-spear':spear,'sides-ranch':lambda:dip('ranch'),'sides-house':lambda:dip('house'),'sides-macaroni':macaroni,'sides-crumbs':crumb_garnish,'sides-bacon':bacon_garnish}
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(builders)
reportpath=OUT/'authoring-report.json';report=json.loads(reportpath.read_text()) if reportpath.exists() else {}
for name in selected:report[name]=export(name,builders[name]())
reportpath.write_text(json.dumps(report,indent=2)+'\n')
(OUT/'manifest.json').write_text(json.dumps({'version':1,'ingredients':{name:{'url':r['url'],'width':r['width']} for name,r in report.items()}},indent=2)+'\n')
recipepath=ROOT/'food-recipes-sides.js'
if recipepath.exists():
 offsets={k.removeprefix('sides-'):[round((v['boundsMin'][0]+v['boundsMax'][0])/2,7),round(v['boundsMin'][2],7),round(-(v['boundsMin'][1]+v['boundsMax'][1])/2,7)] for k,v in report.items()}
 text=recipepath.read_text();text=re.sub(r'const authoredOffsets = .*?;\n','const authoredOffsets = '+json.dumps(offsets,indent=2)+';\n',text,count=1,flags=re.S);recipepath.write_text(text)
print('Done modular sides.',flush=True)
