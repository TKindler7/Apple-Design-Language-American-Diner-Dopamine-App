"""Deterministic shape refinements from the reviewed baseline; run with Blender.
Original texture images remain untouched. Baselines come from the recorded Git commit.
"""
import bpy, math, json, subprocess
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise_vector
ROOT=Path(__file__).resolve().parents[2]
BASE='bf29f323730c9e410e72119bb587e3a00ffd4a57'
CACHE=ROOT/'.local-ai/realism-baseline';CACHE.mkdir(parents=True,exist_ok=True)
reports=[]
def load(family,key):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 path=CACHE/(key+'.glb')
 path.write_bytes(subprocess.check_output(['git','show',f'{BASE}:assets/models/{family}/{key}.glb'],cwd=ROOT))
 bpy.ops.import_scene.gltf(filepath=str(path))
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in objs:
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 return objs

def export(family,key,objects,width=None,height=None):
 coords=[v.co for o in objects for v in o.data.vertices]
 low=Vector([min(p[i] for p in coords) for i in range(3)]);high=Vector([max(p[i] for p in coords) for i in range(3)])
 if width and height:
  sx=width/max(high.x-low.x,high.y-low.y);sz=height/(high.z-low.z)
  for o in objects:
   for v in o.data.vertices:v.co=Vector(((v.co.x-(low.x+high.x)/2)*sx,(v.co.y-(low.y+high.y)/2)*sx,(v.co.z-low.z)*sz))
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 coords=[v.co for o in objects for v in o.data.vertices];low=Vector([min(p[i] for p in coords) for i in range(3)]);high=Vector([max(p[i] for p in coords) for i in range(3)])
 out=ROOT/'assets/models'/family/(key+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT')
 manifest_path=out.parent/'manifest.json';manifest=json.loads(manifest_path.read_text());manifest['ingredients'][key]={'url':'./'+out.name,'width':width or max(high.x-low.x,high.y-low.y)};manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
 reports.append({'asset':key,'width':manifest['ingredients'][key]['width'],'height':high.z-low.z,'bytes':out.stat().st_size})

for variant in range(3):
 objs=load('savory','savory-pancake');phase=variant*1.9
 for o in objs:
  for v in o.data.vertices:
   x,y,z=v.co;r=math.hypot(x,y)/1.2;a=math.atan2(y,x)
   warp=1+.035*math.sin(3*a+phase)+.018*math.cos(7*a-phase)
   v.co.x=x*warp+.018*math.sin(y*4+phase);v.co.y=y*warp*.97
   v.co.z=z*(1+.075*math.sin(x*2+phase)*math.cos(y*2))+.006*r*math.sin(11*a+phase)
  for m in o.data.materials:
   b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Roughness'].default_value=.72
 export('savory','savory-pancake'+('' if variant==0 else f'-{variant+1}'),objs,2.4,.1906178994)

for variant in range(2):
 objs=load('savory','savory-egg-sunny')
 for o in objs:
  yolk_material=o.data.materials[0].copy();yolk_material.name='Soft moist yolk'
  yolk_material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.31
  o.data.materials.append(yolk_material)
  for face in o.data.polygons:
   if sum(o.data.vertices[i].co.z for i in face.vertices)/len(face.vertices)>.065:face.material_index=len(o.data.materials)-1
  for v in o.data.vertices:
   x,y,z=v.co;a=math.atan2(y,x);r=math.hypot(x,y)
   # Whites spread asymmetrically; yolks remain soft, seated domes.
   white=max(0,1-z/.07)
   v.co.x=x*(1+.09*math.sin(3*a+variant*2)*white)+.025*math.sin(y*5+variant)*white
   v.co.y=y*(1+.06*math.cos(5*a+variant)*white)
   if z>.065:
    v.co.x=x*.92+.035*(variant*2-1);v.co.y=y*1.05
    v.co.z=z*(.94+.025*math.sin(x*8+y*5))
   else:v.co.z=z+.003*white*math.sin(x*31)*math.sin(y*29)
 export('savory','savory-egg-sunny'+('' if variant==0 else '-2'),objs,1.65,.195)

# Scrambled eggs need softly folded curds rather than thick cut-looking pieces.
objs=load('savory','savory-eggs-scrambled')
for i,o in enumerate(objs):
 low=Vector([min(v.co[k] for v in o.data.vertices) for k in range(3)]);high=Vector([max(v.co[k] for v in o.data.vertices) for k in range(3)])
 center=(low+high)/2
 for v in o.data.vertices:
  local=v.co-center
  v.co.z=center.z+local.z*.60+.026*math.sin(local.x*15+i*.7)+.012*math.cos(local.y*23+i)
 bpy.context.view_layer.objects.active=o
 sub=o.modifiers.new('Rounded soft curd folds','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
 for m in o.data.materials:m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.44
export('savory','savory-eggs-scrambled',objs,1.65,.22)

for variant in range(3):
 objs=load('sides','sides-pickle-spear');phase=variant*2.1
 for o in objs:
  bpy.context.view_layer.objects.active=o
  sub=o.modifiers.new('Fine breaded silhouette','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
  for v in o.data.vertices:
   x,y,z=v.co;t=y/1.67+.5
   v.co.x=x*(.89+.10*math.sin(t*5+phase))+.045*math.sin(t*math.pi+phase)
   v.co.y=y*(.94+variant*.045)
   v.co.z=z*(.90+.12*math.sin(t*4+phase))+.012*math.sin(t*math.pi)
   n=noise_vector(v.co*95+Vector((variant*10,2,7)))
   v.co+=v.normal*(.0025*n.x)
  for p in o.data.polygons:
   if p.material_index==0:
    for i in p.loop_indices:o.data.uv_layers.active.data[i].uv.x+=variant*.17
 export('sides','sides-pickle-spear'+('' if variant==0 else f'-{variant+1}'),objs)

# Thin, smooth vessels remove the thick fluted lens effect. Keep actual glass IOR.
def glass_material():
 m=bpy.data.materials.new('Thin clear glass');m.use_nodes=True;m.use_backface_culling=True
 b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(1,1,1,1);b.inputs['Roughness'].default_value=.085;b.inputs['IOR'].default_value=1.45;b.inputs['Transmission Weight'].default_value=1;b.inputs['Specular IOR Level'].default_value=.5
 return m

def lathe(profile):
 verts=[];faces=[];segments=160
 for r,z in profile:
  for i in range(segments):
   a=i*math.tau/segments;verts.append((max(r,.00001)*math.cos(a),max(r,.00001)*math.sin(a),z))
 for j in range(len(profile)-1):
  for i in range(segments):
   a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
 faces.extend([tuple(reversed(range(segments))),tuple((len(profile)-1)*segments+i for i in range(segments))])
 mesh=bpy.data.meshes.new('Smooth thin vessel');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Clear glass vessel',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(glass_material())
 for p in mesh.polygons:p.use_smooth=True
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 return o
bpy.ops.wm.read_factory_settings(use_empty=True)
glass=lathe([(.0001,0),(.48,0),(.526,.025),(.54,.10),(.575,.8),(.625,1.7),(.677,2.65),(.677,2.665),(.669,2.671),(.661,2.660),(.611,1.7),(.561,.8),(.527,.085),(.48,.065),(.0001,.065)])
export('sweet','sweet-glass',[glass])
bpy.ops.wm.read_factory_settings(use_empty=True)
bowl=lathe([(.0001,0),(.54,0),(.55,.035),(.47,.07),(.12,.13),(.105,.38),(.38,.43),(.76,.67),(1.05,1.025),(1.055,1.05),(1.044,1.058),(1.034,1.04),(.748,.68),(.36,.46),(.0001,.455)])
export('sweet','sweet-sundae-bowl',[bowl])
# Fit the liquid volume to the inner vessel instead of leaving a refractive air gap.
def interpolate(points,z):
 for (za,ra),(zb,rb) in zip(points,points[1:]):
  if z<=zb:return ra+(rb-ra)*max(0,(z-za)/(zb-za))
 return points[-1][1]
for key in ['shake-cherry','shake-vanilla','shake-chocolate','soda','coldbrew']:
 objs=load('sweet','sweet-'+key)
 top=2.31 if key.startswith('shake') else 2.28
 for o in objs:
  for v in o.data.vertices:
   x,y,z=v.co
   original_radius=interpolate([(0,.49),(.55,.53),(1.35,.57),(2.28,.615)],z)
   nz=z*(top+.083)/top
   radius=interpolate([(.067,.50),(.085,.526),(.8,.560),(1.7,.610),(2.66,.660)],nz+.067)
   v.co.x=x*radius/original_radius;v.co.y=y*radius/original_radius;v.co.z=nz
 export('sweet','sweet-'+key,objs)

(ROOT/'assets/models/realism-refinement.json').write_text(json.dumps({'baseline':BASE,'method':'Original mesh refinements and new thin-wall glass geometry; original texture sources preserved.','script':'scripts/food-assets/refine-realism.py','assets':reports},indent=2)+'\n')
