"use client";
import { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMuscleBody } from "@/lib/muscle-body";
import { type BodyView, type MuscleGroup } from "@/lib/muscle-guide";
interface Props {
    group: MuscleGroup;
    activeTargets: string[];
    focusedTarget: string | null;
    view: BodyView;
    viewRequest: number;
    pulsing: boolean;
    onSelect: (id: string) => void;
    onActivate: (id: string) => void;
    enabled?: boolean;
}
export default function MuscleBody3D(props: Props) {
    const markerId = useId().replace(/:/g, "");
    const container = useRef<HTMLDivElement>(null);
    const live = useRef(props);
    live.current = props;
    const update = useRef<(() => void) | null>(null);
    const [unavailable, setUnavailable] = useState(false);
    const [ready, setReady] = useState(false);
    const lastTap = useRef<{ target: string; time: number; x: number; y: number } | null>(null);
    function tapTarget(target: string, x: number, y: number, time: number) {
        const previous = lastTap.current;
        if (previous?.target === target && time - previous.time < 400 && Math.hypot(x - previous.x, y - previous.y) < 24) {
            lastTap.current = null;
            live.current.onActivate(target);
        } else {
            lastTap.current = { target, time, x, y };
            live.current.onSelect(target);
        }
    }
    useEffect(() => { lastTap.current = null; }, [props.group.id, props.enabled]);
    useEffect(() => {
        const host = container.current;
        if (!host)
            return;
        const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: "low-power" });
        }
        catch {
            setUnavailable(true);
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;
        renderer.shadowMap.enabled = !mobile;
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor("#11171e", 0);
        renderer.domElement.setAttribute("aria-label", "Rotatable 3D human body. Use the region buttons to select muscles.");
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.style.touchAction = "pan-y";
        host.prepend(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.enableDamping = false;
        controls.minDistance = 4;
        controls.maxDistance = 14;
        controls.minPolarAngle = Math.PI * .27;
        controls.maxPolarAngle = Math.PI * .70;
        controls.touches.ONE = THREE.TOUCH.ROTATE;
        controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
        const loadController = new AbortController();
        const { body, muscles, anchors, ready: modelReady } = createMuscleBody(loadController.signal);
        scene.add(body);
        const environmentScene = new RoomEnvironment();
        const environmentGenerator = new THREE.PMREMGenerator(renderer);
        const environment = environmentGenerator.fromScene(environmentScene,.04);
        scene.environment = environment.texture;
        scene.environmentIntensity = .38;
        environmentScene.dispose();environmentGenerator.dispose();
        scene.add(new THREE.HemisphereLight("#e3edff","#141b27",1.2));
        const key = new THREE.DirectionalLight("#fff2e1",3.6);key.position.set(-3.5,5,5);key.castShadow=!mobile;
        key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=3.5;key.shadow.camera.bottom=-3.5;key.shadow.normalBias=.025;key.shadow.bias=-.0001;
        scene.add(key);
        const rim = new THREE.DirectionalLight("#f4c9ce",2.6);rim.position.set(3.5,2.5,-4);scene.add(rim);
        const fill = new THREE.DirectionalLight("#c1d2ee",1.0);fill.position.set(3,1,5);scene.add(fill);
        const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4,96),new THREE.ShadowMaterial({color:"#000000",opacity:.28}));
        floor.rotation.x=-Math.PI/2;floor.position.y=-2.305;floor.receiveShadow=true;scene.add(floor);
        const stage = new THREE.Mesh(new THREE.RingGeometry(.76,.77,96),new THREE.MeshBasicMaterial({color:"#8ca6c6",transparent:true,opacity:.12,side:THREE.DoubleSide}));
        stage.rotation.x=-Math.PI/2;stage.position.y=-2.31;scene.add(stage);
        let active = true, visible = true, frame = 0, lastView = "", lastGroup = "", lastRequest = -1;
        const render = () => {
            if (!active || !visible || live.current.enabled === false || document.hidden)
                return;
            const current = live.current;
            const colors = new Map(current.group.regions.map(region => [region.id, region.color]));
            const pulse = current.pulsing && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? .17 + .12 * Math.sin(performance.now() * .003) : .12;
            for (const { mesh, target } of muscles) {
                const color = colors.get(target);
                const shown = Boolean(color) && current.activeTargets.includes(target);
                const focused = current.focusedTarget === target;
                mesh.material.color.copy(mesh.userData.baseColor);
                if (shown) mesh.material.color.set(focused ? "#f35a64" : "#cd3e4e");
                if (current.focusedTarget && !focused)
                    mesh.material.color.multiplyScalar(.65);
                mesh.material.emissive.set(shown ? "#b81730" : "#000000");
                mesh.material.emissiveIntensity = shown ? (focused ? .22 : pulse*.6) : 0;
            }
            scene.updateMatrixWorld();
            camera.updateMatrixWorld();
            const rear = camera.position.z < 0;
            const w = host.clientWidth, h = host.clientHeight;
            const points = current.group.regions.map(region => {
                const point = (anchors.get(region.id)?.clone() ?? new THREE.Vector3(...region.anchor)).project(camera);
                return { region, x: (point.x * .5 + .5) * w, y: (-point.y * .5 + .5) * h, visible: (region.view === "back") === rear && point.z < 1 };
            });
            for (const right of [false, true]) {
                const column = points.filter(point => point.visible && (w < 480 ? right : (point.x > w / 2) === right)).sort((a, b) => a.y - b.y);
                let previous = 88;
                const spaced = column.map(point => { const y = Math.max(previous, point.y); previous = y + 48; return { ...point, labelY: y }; });
                const shift = Math.max(0, (spaced.at(-1)?.labelY ?? 0) - (h - 30));
                for (const point of spaced) {
                    const label = host.querySelector<HTMLButtonElement>(`[data-muscle-label="${point.region.id}"]`);
                    const line = host.querySelector<SVGLineElement>(`[data-muscle-leader="${point.region.id}"]`);
                    const labelWidth = w < 480 ? 84 : 132;
                    const x = right ? w - labelWidth / 2 - 10 : labelWidth / 2 + 10, y = point.labelY - shift;
                    if (label) {
                        label.hidden = false;
                        label.style.display = "flex";
                        label.style.left = `${x}px`;
                        label.style.textAlign = right ? "left" : "right";
                        label.style.width = `${labelWidth}px`;
                        label.style.top = `${y}px`;
                    }
                    if (line) {
                        line.style.display = "";
                        line.setAttribute("x1", String(right ? x - labelWidth / 2 : x + labelWidth / 2));
                        line.setAttribute("y1", String(y));
                        line.setAttribute("x2", String(point.x));
                        line.setAttribute("y2", String(point.y));
                    }
                }
            }
            for (const point of points.filter(point => !point.visible)) {
                const label = host.querySelector<HTMLButtonElement>(`[data-muscle-label="${point.region.id}"]`);
                if (label) {
                    label.hidden = true;
                    label.style.display = "none";
                }
                const line = host.querySelector<SVGLineElement>(`[data-muscle-leader="${point.region.id}"]`);
                if (line)
                    line.style.display = "none";
            }
            renderer.render(scene, camera);
            host.dataset.drawCalls = String(renderer.info.render.calls);
            host.dataset.triangles = String(renderer.info.render.triangles);
        };
        const setView = () => { const current = live.current; if (lastView !== current.view || lastGroup !== current.group.id || lastRequest !== current.viewRequest) {
            const narrow = host.clientWidth < 480;
            const distance = narrow ? 12 : 8.6;
            const offset = narrow ? (current.view === "back" ? -.48 : .48) : 0;
            camera.position.set(offset, .25, current.view === "back" ? -distance : distance);
            controls.target.set(offset, .02, 0);
            controls.update();
            lastView = current.view;
            lastGroup = current.group.id;
            lastRequest = current.viewRequest;
        } render(); };
        // Rendering is event-driven; only the optional highlight pulse needs a frame loop.
        const resize = () => { const width = host.clientWidth, height = host.clientHeight; if (!width || !height)
            return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); setView(); };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible)
            update.current?.(); });
        intersection.observe(host);
        const raycaster = new THREE.Raycaster();
        let down: { id: number; x: number; y: number; moved: boolean } | null = null;
        const pointerDown = (event: PointerEvent) => {
            down = event.isPrimary ? { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false } : null;
            if (!event.isPrimary) lastTap.current = null;
        };
        const pointerCancel = () => { down = null; lastTap.current = null; };
        const pointerMove = (event: PointerEvent) => {
            if (down && down.id === event.pointerId && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7) {
                down.moved = true; lastTap.current = null;
            }
        };
        const pointerUp = (event: PointerEvent) => {
            const start = down; down = null;
            if (!start || start.moved || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
                lastTap.current = null; return;
            }
            const rect = renderer.domElement.getBoundingClientRect();
            raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
            const hit = raycaster.intersectObjects(body.children, false)[0];
            const target = hit?.object.userData.target as string | undefined;
            if (target && live.current.group.regions.some(region => region.id === target)) tapTarget(target, event.clientX, event.clientY, event.timeStamp);
            else lastTap.current = null;
        };
        const contextLost = (event: Event) => { event.preventDefault(); setUnavailable(true); };
        renderer.domElement.addEventListener("pointerdown", pointerDown);
        renderer.domElement.addEventListener("pointerup", pointerUp);
        renderer.domElement.addEventListener("pointercancel", pointerCancel);
        renderer.domElement.addEventListener("pointermove", pointerMove);
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        controls.addEventListener("change", render);
        const canAnimate = () => live.current.enabled !== false && live.current.pulsing && visible && !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const tick = () => { frame = 0; if (!active || !canAnimate())
            return; render(); frame = requestAnimationFrame(tick); };
        const sync = () => { setView(); if (canAnimate() && !frame)
            frame = requestAnimationFrame(tick);
        else if (!canAnimate() && frame) {
            cancelAnimationFrame(frame);
            frame = 0;
        } };
        update.current = sync;
        document.addEventListener("visibilitychange", sync);
        resize();
        modelReady.then(() => { if (active) { renderer.shadowMap.needsUpdate = !mobile; resize();setReady(true); } }).catch(() => { if (active) setUnavailable(true); });
        return () => { active = false; loadController.abort();environment.dispose();key.shadow.dispose(); cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); controls.dispose(); document.removeEventListener("visibilitychange", sync); update.current = null; renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointerup", pointerUp); renderer.domElement.removeEventListener("pointercancel", pointerCancel); renderer.domElement.removeEventListener("pointermove", pointerMove); renderer.domElement.removeEventListener("webglcontextlost", contextLost); const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(); scene.traverse(object => { if (object instanceof THREE.Mesh) {
            if (!object.userData.sharedAnatomyGeometry) geometries.add(object.geometry);
            for (const material of Array.isArray(object.material) ? object.material : [object.material])
                materials.add(material);
        } }); geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
    }, []);
    useEffect(() => { update.current?.(); }, [ready, props.group.id, props.view, props.viewRequest, props.activeTargets, props.focusedTarget, props.pulsing, props.enabled]);
    return <div className="relative overflow-hidden rounded-2xl border border-rose-200/10 bg-[radial-gradient(ellipse_at_50%_45%,#36212b_0%,#171722_48%,#090d15_100%)]">
      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <span className="block text-[10px] font-semibold uppercase tracking-[.2em] text-rose-200/70">Anatomy</span>
      </div>
      <a href="/models/anatomy/ATTRIBUTION.txt" target="_blank" rel="noreferrer" className="absolute bottom-3 left-4 z-10 text-[9px] text-white/45 underline decoration-white/20 underline-offset-2 hover:text-white/80">Z-Anatomy / BodyParts3D · CC BY-SA 4.0</a>
      <div ref={container} data-body-model data-model-style="z-anatomy" data-model-ready={ready && !unavailable} className="relative h-[500px] w-full sm:h-[540px]">
        {!ready && !unavailable && <div role="status" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#171722]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/models/anatomy/preview-${props.view}.webp`} alt="" width={290} height={540} className="h-80 w-auto max-w-full object-contain" />
          <span className="text-xs text-white/65">Loading 3D anatomy...</span>
        </div>}
        {ready && !unavailable && <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>{props.group.regions.map(region => <marker key={region.id} id={`${markerId}-${region.id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8 2 4Z" fill={region.color}/></marker>)}</defs>
          {props.group.regions.map(region => <line key={region.id} data-muscle-leader={region.id} stroke={region.color} strokeWidth="1.3" opacity=".85" markerEnd={`url(#${markerId}-${region.id})`}/>)}
        </svg>}
        {ready && !unavailable && props.group.regions.map(region => <button key={region.id} data-muscle-label={region.id} title={`${region.label}: double-tap to find exercises`} aria-label={`Locate ${region.label}`} aria-pressed={props.focusedTarget === region.id} onClick={event => { if (event.detail === 0) { lastTap.current = null; props.onSelect(region.id); } else tapTarget(region.id, event.clientX, event.clientY, event.timeStamp); }} style={{color:region.color,display:region.view === props.view ? "flex" : "none"}} className="absolute z-10 min-h-11 w-[84px] -translate-x-1/2 -translate-y-1/2 touch-manipulation select-none items-center break-words rounded px-1 py-1 text-left text-[11px] font-medium leading-4 transition hover:brightness-125 sm:w-[132px] sm:text-sm">
          {region.id === "gastrocnemius" ? "Gastrocnemius" : region.id === "soleus" ? "Soleus" : region.label}
        </button>)}
        {unavailable && <div role="status" className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <svg viewBox="0 0 120 240" className="h-56 w-28 text-white/40" aria-hidden="true"><circle cx="60" cy="24" r="15" fill="currentColor"/><path d="M40 49Q60 42 80 49L88 106 77 133 77 217H64L60 150 56 217H43V133L32 106Z" fill="currentColor"/><path d="M37 55 18 119M83 55 102 119" stroke="currentColor" strokeWidth="13" strokeLinecap="round"/></svg>
          <p className="text-xs text-white/50">3D unavailable</p>
        </div>}
      </div>
    </div>;
}
