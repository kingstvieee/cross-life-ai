#!/usr/bin/env python3
"""Reproducible, PRIVATE-REVIEW 3D rigging of exact owner-reviewed Build228 bytes.

Do not place output in signed production assets, assert identity/device acceptance,
or upload personal likeness/GLB to public repositories. The original mesh, UVs,
morph targets, materials, textures, and facial clips remain byte-identical.
Only scene hierarchy, new transform nodes and animation float arrays are added.
"""
import copy
import hashlib
import json
import math
import pathlib
import struct
import sys

SOURCE_SHA = "4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b"
OUTPUT_NAME = "Guardian_Build242_Articulated_Motion_Review_Only.glb"
JOINT_PREFIX = "B230_QA_Joint_"
JOINT_ORDER = (
    "Pelvis", "Spine", "Chest", "UpperArm_L", "UpperArm_R",
    "Forearm_L", "Forearm_R", "Thigh_L", "Thigh_R",
    "Calf_L", "Calf_R", "Foot_L", "Foot_R",
)
GLTF_PAD = lambda n: (4 - n % 4) % 4

def die(reason):
    raise ValueError("guardian_build242_" + reason)

def load_glb(path):
    raw = pathlib.Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA:
        die("wrong_source_hash")
    if raw[:4] != b"glTF" or struct.unpack_from("<I", raw, 4)[0] != 2:
        die("invalid_glb")
    jlen, jtag = struct.unpack_from("<I4s", raw, 12)
    if jtag != b"JSON":
        die("invalid_json_chunk")
    model = json.loads(raw[20:20+jlen])
    offset = 20 + jlen
    blen, btag = struct.unpack_from("<I4s", raw, offset)
    if btag != b"BIN\x00" or offset + 8 + blen != len(raw):
        die("bad_binary_length")
    return model, raw[offset+8:], raw

def build(source, destination):
    gltf, old_bin, source_bytes = load_glb(source)
    old_mesh = copy.deepcopy(gltf["meshes"])
    old_material = copy.deepcopy(gltf["materials"])
    old_images = copy.deepcopy(gltf.get("images"))
    old_skins = copy.deepcopy(gltf["skins"])
    old_animations = copy.deepcopy(gltf["animations"])
    nodes = gltf["nodes"]
    if len(nodes) != 168 or gltf["scenes"][0]["nodes"] != [0,161,150] or len(gltf["skins"]) != 1:
        die("unexpected_scene_hierarchy")
    if nodes[0].get("children") != list(range(1,150)):
        die("unexpected_armor_topology")
    if nodes[161].get("translation") != [0,0,2.98]:
        die("unexpected_face_bone_position")
    if any(any(k in nodes[i] for k in ("translation","rotation","scale","matrix","children")) for i in range(1,150)):
        die("armor_rest_transform_unexpected")
    if [a.get("name") for a in gltf["animations"]] != [
       "BUILD191_REVIEW_DEMO_NOT_SPEECH_CALIBRATED",
       "STAAR_16_VISEME_PCM_WORD_ALIGNED_CALIBRATION",
       "STAAR_BUILD199_ALL_16_FACIAL_POSES_VISUAL_DEMO"]:
        die("facial_animation_immutable")
    nodes[161].setdefault("extras",{}).update({
       "staarGazeRole":"head",
       "staarGazeAxis":"localZ",  # Authoring: Z-up; Y-up viewer by approved -90-degree root rotation
    })
    def new_joint(label, local_pos):
        name = JOINT_PREFIX+label
        if any(n.get("name")==name for n in nodes):die("duplicate_joint")
        node = {"name":name,"translation":[float(n) for n in local_pos],"children":[]}
        nodes.append(node)
        return len(nodes)-1
    # Original asset uses Z as height, -Y forward, right hand +X.
    P = new_joint("Pelvis",(0,0,0))
    S = new_joint("Spine",(0,0,1.10))
    C = new_joint("Chest",(0,0,.55)) # rest world 1.65m
    UL = new_joint("UpperArm_L",(-.68,0,.43)) # rest (-.68,0,2.08)
    UR = new_joint("UpperArm_R",(.68,0,.43))
    FL = new_joint("Forearm_L",(-.15,0,-.70)) # rest (-.83,0,1.38)
    FR = new_joint("Forearm_R",(.15,0,-.70))
    TL = new_joint("Thigh_L",(-.25,0,1.03))
    TR = new_joint("Thigh_R",(.25,0,1.03))
    KL = new_joint("Calf_L",(.01,0,-.61))
    KR = new_joint("Calf_R",(-.01,0,-.61))
    BL = new_joint("Foot_L",(0,0,-.34))
    BR = new_joint("Foot_R",(0,0,-.34))
    idx = dict(zip(JOINT_ORDER,(P,S,C,UL,UR,FL,FR,TL,TR,KL,KR,BL,BR)))
    # Physical parent chain: new nodes are Transform articulation pivots,
    # not fake face/body skin-weight claims.
    for parent, children in (
       (0,[P]), (P,[S,TL,TR]), (S,[C]), (C,[UL,UR,161]),
       (UL,[FL]), (UR,[FR]), (TL,[KL]), (TR,[KR]),
       (KL,[BL]), (KR,[BR])):
        nodes[parent].setdefault("children",[]).extend(children)
    # The head and its independent hair, studs, lips and jaw remain attached
    # to the *existing* two-bone facial skin rig at the same absolute rest pose.
    nodes[161]["translation"] = [0,0,2.98-1.65]
    # All meshes retain original vertex streams and morph targets. Rest
    # coordinates are compensated so adding articulation nodes does not move art.
    assigned = set()
    parent_groups = [
       (C,list(range(1,51))+list(range(105,150)),(0,0,1.65)),
       (UL,list(range(51,60)),(-.68,0,2.08)),
       (FL,list(range(60,71)),(-.83,0,1.38)),
       (TL,[71,72],(-.25,0,1.03)),
       (KL,[73,74,75],(-.24,0,.42)),
       (BL,[76,77],(-.24,0,.08)),
       (UR,list(range(78,87)),(.68,0,2.08)),
       (FR,list(range(87,98)),(.83,0,1.38)),
       (TR,[98,99],(.25,0,1.03)),
       (KR,[100,101,102],(.24,0,.42)),
       (BR,[103,104],(.24,0,.08)),
    ]
    for parent, parts, world_pivot in parent_groups:
        for i in parts:
            if i in assigned: die("duplicate_armor_assignment")
            assigned.add(i)
            nodes[parent]["children"].append(i)
            nodes[i]["translation"]=[-float(v) for v in world_pivot]
    if assigned != set(range(1,150)):
        die("missing_armor_meshes")
    nodes[0]["children"] = [P]
    # Existing head skin is still part of the same 3D tree, driven by bone 161.
    # The actual head mesh (150) remains an independently skinned node.
    # Rotate the complete human from original Z-up to glTF/Three.js Y-up.
    axis_root=len(nodes)
    nodes.append({
       "name":"STAAR_Guardian_Actor_YUp",
       "rotation":[-math.sqrt(.5),0,0,math.sqrt(.5)],
       "children":[0,150],
       "extras":{"staarActorReviewOnly":True,"staarAuthoringUp":"Z","staarRuntimeUp":"Y"},
    })
    gltf["scenes"][0]["nodes"] = [axis_root]

    # Preserve the source BIN prefix *exactly*; append typed arrays for animation.
    new_bin = bytearray(old_bin)
    def accessor(values, kind):
        nonlocal new_bin
        count={"SCALAR":1,"VEC3":3,"VEC4":4}[kind]
        if len(values)%count:die("invalid_accessor")
        while len(new_bin)%4:new_bin.append(0)
        offset=len(new_bin)
        new_bin.extend(struct.pack("<"+"f"*len(values),*[float(x) for x in values]))
        view=len(gltf["bufferViews"])
        gltf["bufferViews"].append({"buffer":0,"byteOffset":offset,"byteLength":len(values)*4})
        k=len(gltf["accessors"])
        acc={"bufferView":view,"componentType":5126,"count":len(values)//count,"type":kind}
        if kind=="SCALAR":
            acc["min"]=[min(values)];acc["max"]=[max(values)]
        gltf["accessors"].append(acc)
        return k
    def quat_x(t):
        return [math.sin(t/2),0,0,math.cos(t/2)]
    def quat_z(t):
        return [0,0,math.sin(t/2),math.cos(t/2)]
    def gait_samples(times,speed=1.0,fade=None):
        for phase in times:
            step=math.sin(phase*math.pi*2)
            right=-step
            confidence=1.0 if fade is None else fade(phase)
            power=speed*confidence
            fL=step*power
            fR=right*power
            bendL=max(0, math.sin(phase*math.pi*2 + math.pi/2))*power*.22
            bendR=max(0, math.sin(phase*math.pi*2 - math.pi/2))*power*.22
            walk={
             "Pelvis":[0,0,confidence*(.018+.02*math.cos(phase*math.pi*4))],
             "Spine":quat_x(.015*fL),
             "Chest":quat_z(.012*fL),
             "UpperArm_L":quat_x(-.42*fL), "UpperArm_R":quat_x(-.42*fR),
             "Forearm_L":quat_x(.16+.12*abs(fL)), "Forearm_R":quat_x(.16+.12*abs(fR)),
             "Thigh_L":quat_x(.40*fL), "Thigh_R":quat_x(.40*fR),
             "Calf_L":quat_x(-bendL), "Calf_R":quat_x(-bendR),
             "Foot_L":quat_x(-.25*fL + bendL*.4),
             "Foot_R":quat_x(-.25*fR + bendR*.4),
            }
            if fade is not None and confidence==0:
                walk["Forearm_L"]=quat_x(0);walk["Forearm_R"]=quat_x(0)
            yield walk
    def motion(name, duration, phases, speed=1.0,fade=None):
        if not 0 < duration <= 10:die("invalid_duration")
        times=[float(p)*duration for p in phases]
        if len(times)<2 or times[0]!=0 or times[-1]!=duration:die("invalid_times")
        sampler_idx=len(gltf["animations"])
        ts=accessor(times,"SCALAR")
        frames=list(gait_samples(phases,speed,fade))
        samplers=[];channels=[]
        for key in JOINT_ORDER:
            ty="VEC3" if key=="Pelvis" else "VEC4"
            vals=[v for frame in frames for v in frame[key]]
            out=accessor(vals,ty)
            sample=len(samplers)
            samplers.append({"input":ts,"output":out,"interpolation":"LINEAR"})
            channels.append({"sampler":sample,"target":{"node":idx[key],"path":"translation" if key=="Pelvis" else "rotation"}})
        gltf["animations"].append({"name":name,"samplers":samplers,"channels":channels,
             "extras":{"staarPrivateReview":True,"bodyOnly":True,"sourceBodyArtPreserved":True}})
    walk=[i/8 for i in range(9)]
    motion("WALK_IN_PLACE_BODY_QA",1.16,walk,1.0)
    motion("RUN_IN_PLACE_BODY_QA",.72,walk,1.5)
    motion("BUILD236_WALK_START_BODY_QA",.6,walk,1.0,lambda p:p)
    motion("BUILD236_WALK_STOP_BODY_QA",.55,walk,1.0,lambda p:1-p)
    motion("BUILD236_RUN_START_BODY_QA",.5,walk,1.5,lambda p:p)
    motion("BUILD236_RUN_STOP_BODY_QA",.5,walk,1.5,lambda p:1-p)
    # Optional movement: one authored greeting / hand-on-portal sequence.
    # The gesture is NOT controlled by the general locomotion QA clip set.
    phases=[0,.2,.4,.6,.8,1.]
    gesture_times=accessor([t*1.4 for t in phases],"SCALAR")
    channels=[];samplers=[]
    for name,values in [
        ("UpperArm_R",[0,-.20,-.80,-.95,-.46,0]),
        ("Forearm_R",[.15,.35,1.0,1.18,.70,.15]),
        ("Chest",[0,.03,.06,.06,.03,0]),
    ]:
        index=idx[name]
        out=accessor([v for val in values for v in quat_x(val) ],"VEC4")
        samplers.append({"input":gesture_times,"output":out,"interpolation":"LINEAR"})
        channels.append({"sampler":len(samplers)-1,"target":{"node":index,"path":"rotation"}})
    gltf["animations"].append({"name":"STAAR_PORTAL_OPEN_GESTURE_REVIEW","samplers":samplers,"channels":channels,
        "extras":{"staarPrivateReview":True,"noOwnerMotionApproval":True}})
    # Quiet physical breathing is deliberately independent of leg and arm clips.
    breath_time=accessor([0,.9,1.8,2.7,3.6],"SCALAR")
    breath_values=[]
    for n in [0,.009,0,-.006,0]:
        breath_values.extend([1+n,1+n*.4,1+n*.8])
    breath=accessor(breath_values,"VEC3")
    gltf["animations"].append({
       "name":"breathing",
       "samplers":[{"input":breath_time,"output":breath,"interpolation":"LINEAR"}],
       "channels":[{"sampler":0,"target":{"node":idx["Chest"],"path":"scale"}}],
       "extras":{"staarPrivateReview":True},
    })
    gltf["buffers"][0]["byteLength"]=len(new_bin)
    gltf.setdefault("extras",{}).update({
        "staarStatus":"PRIVATE_MOTION_AND_LIKENESS_REVIEW_ONLY",
        "baseAssetSha256":SOURCE_SHA,
        "bodyArtGeometryIdentical":True,
        "faceGeometryIdentical":True,
        "modelIdentityAcceptedForThisNewBinary":False,
        "physicalIphoneCertified":False,
        "sourceImageAndArmourApprovalNotTransferable":True,
        "assetRightsNotClaimed":True,
        "rigType":"hierarchical-rigid-segment-with-original-skinned-head",
        "build":"242",
    })
    if gltf["meshes"]!=old_mesh or gltf["materials"]!=old_material or gltf.get("images")!=old_images or gltf["skins"]!=old_skins:
        die("mesh_or_face_mutated")
    if gltf["animations"][:len(old_animations)] != old_animations:
        die("approved_facial_motion_mutated")
    if bytes(new_bin[:len(old_bin)])!=old_bin:
        die("geometry_binary_modified")
    blob=json.dumps(gltf,separators=(",",":")).encode("utf8")
    blob+=b" "*GLTF_PAD(len(blob))
    new_bin.extend(b"\x00"*GLTF_PAD(len(new_bin)))
    total=12+8+len(blob)+8+len(new_bin)
    data=struct.pack("<4sII",b"glTF",2,total)
    data+=struct.pack("<I4s",len(blob),b"JSON")+blob
    data+=struct.pack("<I4s",len(new_bin),b"BIN\x00")+new_bin
    if len(data)!=total: die("output_length")
    destination=pathlib.Path(destination)
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_bytes(data)
    print(json.dumps({
      "source":str(source),"output":str(destination),
      "sha256":hashlib.sha256(data).hexdigest(),
      "sourceGeometryBytesUnchanged":len(old_bin),
      "finalFileBytes":len(data),
      "newJointNames":list(JOINT_ORDER),
      "animations":[a["name"] for a in gltf["animations"]],
      "nodeCount":len(nodes),"skinCount":len(gltf["skins"]),
      "facialGeometryPreserved":True,"identityReleaseApproved":False
    },indent=2))

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: build_guardian_articulated_review.py SOURCE.glb PRIVATE_OUTPUT.glb")
    build(sys.argv[1],sys.argv[2])
