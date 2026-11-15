"""Author editable, real 3D portal geometry. Run with Blender, not system Python.

These are review assets, not automatic approval of visual fidelity. No billboards
or reference images masquerade as geometry. Hotspot IDs are application metadata.
"""
import bpy, math, random, json, hashlib, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'frontend/assets/3d'
OUT.mkdir(parents=True, exist_ok=True)
random.seed(73)

def material(name, color, metallic=0, rough=.3, emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metallic; p.inputs['Roughness'].default_value=rough
    p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    return m

def finish(o,name,mat):
    o.name=name; o.data.materials.append(mat)
    if o.type=='MESH':
        for p in o.data.polygons: p.use_smooth=True
    return o

def box(name, pos, scale, mat, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos); o=bpy.context.object; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft crafted edges','BEVEL'); mod.width=bevel; mod.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,name,mat)

def sphere(name,pos,scale,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=pos); o=bpy.context.object; o.scale=scale
    return finish(o,name,mat)

def cylinder(name,pos,radius,depth,mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=radius,depth=depth,location=pos)
    return finish(bpy.context.object,name,mat)

def curve(name,points,mat,thickness=.025):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=thickness; c.bevel_resolution=3
    s=c.splines.new('POLY'); s.points.add(len(points)-1)
    for p, xyz in zip(s.points,points): p.co=(*xyz,1)
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); c.materials.append(mat); return o

def ring(name,center,radius,mat,vertical=False,thickness=.035):
    x,y,z=center
    pts=[(x+radius*math.cos(a*math.tau/96),y+(0 if vertical else radius*math.sin(a*math.tau/96)),z+(radius*math.sin(a*math.tau/96) if vertical else 0)) for a in range(97)]
    return curve(name,pts,mat,thickness)

def arch(name,x,y,z,radius,mat):
    pts=[(x-radius,y,z),(x-radius,y,z+1.5)]
    pts += [(x+radius*math.cos(math.pi-i*math.pi/48),y,z+1.5+radius*math.sin(math.pi-i*math.pi/48)) for i in range(49)]
    pts += [(x+radius,y,z)]
    return curve(name,pts,mat,.09)

def hotspot(name,pos,mat,action):
    o=box('hotspot.'+name,pos,(1.35,.16,.65),mat,.12);o['staar_action']=action
    o['label']=name.replace('-',' ').title()
    bpy.ops.object.text_add(location=(pos[0],pos[1]-.1,pos[2]-.045),rotation=(math.pi/2,0,0))
    text=bpy.context.object;text.data.body=o['label'];text.data.align_x='CENTER';text.data.size=.11;text.data.extrude=.001
    text.data.materials.append(WHITE);text['staar_action']=action;text.name='Console label '+name
    bpy.ops.object.convert(target='MESH')
    return o

def skyline(y=9):
    for i in range(35):
        x=-17+i; height=random.uniform(1,5)
        box('Toronto skyline', (x,y,height/2),(random.uniform(.45,.85),.6,height),DARK,.02)
        for z in range(1,int(height*3)):
            if random.random()>.35: box('Lit window',(x,y-.32,z/3),(.11,.015,.07),WARM,0)
    # CN Tower geometry: tapered shaft, observation deck and antenna.
    bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.19,radius2=.06,depth=6,location=(3,y-1,3))
    finish(bpy.context.object,'CN Tower shaft',CHROME)
    cylinder('CN Tower observation deck',(3,y-1,5.25),.46,.22,CHROME)
    ring('CN Tower deck lights',(3,y-1,5.26),.47,BLUE)
    cylinder('CN Tower antenna',(3,y-1,6.7),.035,1.7,WARM)

def trees(x,y):
    cylinder('Tree trunk',(x,y,1),.09,1.6,WOOD)
    for dx,dy,dz in [(-.4,0,1.8),(.4,.15,2),(0,-.2,2.5)]: sphere('Tree canopy',(x+dx,y+dy,dz),(.7,.65,.8),GREEN)

def sofa(x,y):
    box('Sofa base',(x,y,.42),(2.7,.9,.38),WHITE,.18)
    box('Sofa back',(x,y+.4,.9),(2.7,.24,.85),WHITE,.15)
    for dx in [-1.25,1.25]: box('Sofa arm',(x+dx,y,.7),(.22,.95,.6),WHITE,.1)
    for dx in [-.75,0,.75]: box('Seat cushion',(x+dx,y-.02,.67),(.7,.7,.18),WHITE,.1)

def island(x,y,z,scale=1):
    bpy.ops.mesh.primitive_cone_add(vertices=9,radius1=.2*scale,radius2=2.1*scale,depth=2*scale,location=(x,y,z-scale))
    finish(bpy.context.object,'Floating island rock',STONE)
    cylinder('Floating garden',(x,y,z+.03),2.05*scale,.16,GREEN)
    for i in range(3): trees(x+(i-1)*.8*scale,y+.4)
    box('Waterfall',(x+1.5*scale,y-.5,z-1.7*scale),(.38,.08,3.2*scale),WATER,.01)

def base(world):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=False
    s.world.color=(.18,.2,.25)
    box('Reflective floor',(0,0,-.12),(26,24,.2),CHROME,.01)
    for r in [3.0,3.12,6.5,8.8]: ring('Architectural floor inlay',(0,0,.01),r,WARM,thickness=.018)
    for x in [-9,-6,-3,0,3,6,9]:
        box('Window mullion',(x,7,3.4),(.055,.09,6.8),CHROME,.01)
    box('Window lintel',(0,7,6.8),(23,.15,.15),CHROME,.02)
    for r in [2.6,3.3,4.8,6]: ring('Ceiling light ring',(0,0,6.8),r,WHITE,thickness=.04)
    for x in [-9,9]:
        for y in [-2,4]: cylinder('Chrome column',(x,y,3.5),.2,7,CHROME)
    skyline()
    for pos in [(0,-1,7),(0,-6,5),(7,2,5),(-7,2,5)]:
        bpy.ops.object.light_add(type='AREA',location=pos);bpy.context.object.data.energy=1700;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=8
    bpy.ops.object.camera_add(location=(0,-13,5));cam=bpy.context.object;cam.rotation_euler=(Vector((0,1,2.0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=25;s.camera=cam
    s.render.resolution_x=1440;s.render.resolution_y=900;s.render.resolution_percentage=100
    s['world_id']=world;s['review_status']='geometry_review_required';s['camera_bounds']='x:-9..9,y:-10..5,z:1.4..5'

def work():
    cylinder('Operations console',(0,1,.65),3.4,.65,CHROME)
    ring('Console energy',(0,1,1),3.1,BLUE)
    sphere('Earth hologram',(0,2,3.3),(1.6,1.6,1.6),HOLO)
    for z in [-1.2,-.6,0,.6,1.2]: ring('Globe latitude',(0,2,3.3+z),math.sqrt(2.56-z*z),BLUE,thickness=.012)
    for i,n in enumerate(['Employment','Businesses','Career','Teams']):hotspot(n,(-3+i*2,0,2.4),DARK,'work.'+n.lower())

def home():
    sofa(-3,2);box('Coffee table',(-3,.3,.55),(2,1,.12),WOOD)
    box('Fireplace surround',(1,5,1.4),(3,.5,2.8),STONE);box('Electric hearth',(1,4.7,.75),(2.4,.08,.8),WARM)
    box('Kitchen island',(5,2,.9),(2.8,1.2,1.8),WHITE);box('Kitchen counter',(5,2,1.83),(3,1.4,.1),CHROME)
    for i,n in enumerate(['Rooms','Lighting','Climate','Safety','Kitchen','Routines']):hotspot(n,(-5+i*2,-2,1.2),DARK,'home.'+n.lower())

def dreams():
    for x,y,z,scale in [(-4,3,1.5,1),(3,4,2.4,.8),(0,0,1,.7)]: island(x,y,z,scale)
    for i,n in enumerate(['Create','Film','Design','Write','Build','Learn']): hotspot(n,(-5+i*2,-3,1.5),DARK,'creativity.'+n.lower())

def health():
    for x in [-5,5]:
        box('Clinic consultation couch',(x,2,.75),(2.5,.9,.5),WHITE);box('Clinic headrest',(x,2.5,1.05),(2.5,.3,.6),WHITE)
        arch('Clinic entrance',x,4,0,1.6,CHROME)
    cylinder('Wellbeing station',(0,2,.65),1.8,1.3,WHITE)
    box('Medical cross vertical',(0,2,3),(.22,.18,1.5),BLUE);box('Medical cross horizontal',(0,2,3),(1.2,.18,.22),BLUE)
    for i,n in enumerate(['Wellbeing','Movement','Clinics','Appointments']):hotspot(n,(-3+i*2,-2,1.2),DARK,'wellbeing.'+n.lower())

def love(singles=False):
    accent=PURPLE if singles else RUBY
    box('Velvet platform',(0,2,.35),(5,3,.6),DARK);box('Bed',(0,2,.85),(3.8,2.6,.55),WHITE)
    box('Tufted headboard',(0,3.5,1.5),(4.4,.3,2.2),accent,.22)
    for x in [-3,3]:cylinder('Bedside pedestal',(x,3,.7),.55,1.4,CHROME);sphere('Warm bedside light',(x,3,1.65),(.22,.22,.22),WARM)
    pts=[]
    for i in range(129):
        t=i*math.tau/128;pts.append((.065*16*math.sin(t)**3,3.3,3.7+.065*(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))))
    curve('Heart light',pts,accent,.04)
    for i,n in enumerate(['Connect','Conversations','Boundaries','Together']):hotspot(n,(-3+i*2,-2,1.2),DARK,'relationships.'+n.lower())

def village():
    for r,z in [(3,.25),(3.5,.55),(4,.85)]:
        cylinder('Arena tier',(0,3,z),r,.22,WHITE);ring('Arena light',(0,3,z+.13),r,BLUE)
    cylinder('Arena floor',(0,3,1),2.6,.1,DARK)
    for i,n in enumerate(['Events','Transit','Community','Volunteer']):hotspot(n,(-3+i*2,-3,1.2),DARK,'events.'+n.lower())

def closet():
    for x in [-6,6]:
        box('Wardrobe plinth',(x,2,.2),(3,5,.4),WHITE)
        for y in [0,1.5,3,4.5]:
            box('Wardrobe post',(x-1.2,y,1.7),(.07,.07,3),CHROME)
            box('Wardrobe post',(x+1.2,y,1.7),(.07,.07,3),CHROME)
            box('Garment rail',(x,y,3.15),(2.5,.07,.07),CHROME)
            for dx in [-.8,-.4,0,.4,.8]: box('Unbranded garment',(x+dx,y,2.25),(.25,.18,1.25),WHITE,.06)
    cylinder('RSF display plinth',(0,2,.4),1.4,.8,CHROME)
    for i,n in enumerate(['RSF','Wardrobe','Outfits','Fit']):hotspot(n,(-3+i*2,-2,1.2),DARK,'style.'+n.lower())

def sonic():
    box('Studio console',(0,1,1),(5,1.4,.4),WOOD)
    for x in [-2,-1.5,-1,-.5,0,.5,1,1.5,2]:box('Mixing fader',(x,.8,1.24),(.06,.4,.03),WHITE,.01)
    for x in [-4,4]:
        box('Studio monitor',(x,2,1.5),(1,.7,2),DARK)
        for z,r in [(1,.3),(1.8,.2)]:
            o=cylinder('Monitor cone',(x,1.62,z),r,.08,CHROME);o.rotation_euler[0]=math.pi/2
    pts=[(2.4*math.cos(i*math.pi/64),3,2.8+2.4*math.sin(i*math.pi/64)) for i in range(65)]
    curve('Giant headphone headband',pts,CHROME,.16)
    for x in [-2.4,2.4]:sphere('Headphone ear cup',(x,3,2.7),(.35,.45,.7),DARK)
    for i,n in enumerate(['Create','Record','Mix','Release']):hotspot(n,(-3+i*2,-2,1.2),DARK,'staarsonic.'+n.lower())

def verse():
    for x,y,z,scale in [(-5,3,1.3,1),(4,4,1.7,1.2),(0,-1,1,.8)]: island(x,y,z,scale)
    curve('Holographic bridge',[(-3,3,1.5),(-1,2,1.8),(1,2,2),(3,3,2)],PURPLE,.16)
    for i,n in enumerate(['Milo','Adventure','Cooperative','Library']):hotspot(n,(-3+i*2,-4,1.2),DARK,'staarverse.'+n.lower())

def hub():
    cylinder('Guardian arrival dais',(0,0,.2),2.1,.4,CHROME)
    for r,z in [(2.2,.42),(1.9,.44),(1.6,.46)]:ring('Arrival halo',(0,0,z),r,WHITE)
    names=['home','work','creativity','wellbeing','relationships','events','style','staarverse','staarsonic']
    for i,n in enumerate(names):
        angle=math.radians(20+i*17.5);x=8*math.cos(angle);y=8*math.sin(angle)-2
        arch('Portal arch '+n,x,y,0,1.05,CHROME)
        arch('Portal light '+n,x,y-.02,.05,.94,BLUE if i%2 else WARM)
        hotspot(n,(x,y-.12,.75),DARK,'world.'+n)
        cylinder('Portal base '+n,(x,y,.1),1.25,.2,CHROME)

CHROME=material('Mirror chrome',(.56,.61,.68),.94,.18)
DARK=material('Obsidian glass',(.012,.018,.03),.55,.24)
WHITE=material('Porcelain silver',(.8,.85,.92),.2,.24)
WARM=material('Warm champagne light',(1,.64,.21),.55,.23,3)
BLUE=material('Electric blue',(.08,.5,1),.35,.2,4)
PURPLE=material('Ultraviolet',(.5,.06,1),.3,.25,3)
RUBY=material('Ruby',(.7,.015,.04),.2,.35,1)
WOOD=material('Walnut',(.14,.055,.025),.05,.4)
STONE=material('Charcoal stone',(.1,.13,.16),.15,.6)
GREEN=material('Living foliage',(.035,.2,.075),0,.6)
WATER=material('Waterfall',(.18,.65,.85),.35,.18,1)
HOLO=material('Earth hologram',(.035,.15,.4),.5,.2,1)

builders={'hub':hub,'home':home,'work':work,'creativity':dreams,'wellbeing':health,'relationships':love,'singles':lambda:love(True),'events':village,'style':closet,'staarverse':verse,'staarsonic':sonic}
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
selected=args or list(builders)
manifest=[]
for world in selected:
    base(world);builders[world]()
    # Keep action identifiers in glTF extras and export real mesh geometry.
    path=OUT/(world+'.glb')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(world+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_cameras=True,export_lights=True)
    manifest.append({'world':world,'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'status':'geometry_review_required','hotspots':[o.get('staar_action') for o in bpy.context.scene.objects if o.get('staar_action')]})
    if world=='work':
        bpy.context.scene.render.filepath=str(OUT/'work-review.png');bpy.ops.render.render(write_still=True)
(OUT/'geometry-manifest.json').write_text(json.dumps(manifest,indent=2))
print('AUTHORED_WORLDS', len(manifest))
