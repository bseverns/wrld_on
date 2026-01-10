/*
@nwWrld name: RotatingSpheres
@nwWrld category: 3D
@nwWrld imports: BaseThreeJsModule, THREE
*/

class RotatingSpheres extends BaseThreeJsModule {
  static methods = [
    {
      name: "settings",
      executeOnLoad: true,
      options: [
        { name: "sphereCount", defaultVal: 4, type: "number" },
        { name: "orbitRadius", defaultVal: 2.5, type: "number" },
        { name: "sphereRadius", defaultVal: 0.6, type: "number" },
        { name: "detail", defaultVal: 16, type: "number" },
        { name: "color", defaultVal: "#fff0e1", type: "color" },
        { name: "wireframe", defaultVal: false, type: "boolean" },
        { name: "spinX", defaultVal: 0.01, type: "number" },
        { name: "spinY", defaultVal: 0.015, type: "number" },
        { name: "spinZ", defaultVal: 0, type: "number" },
      ],
    },
    {
      name: "nudge",
      executeOnLoad: false,
      options: [{ name: "amount", defaultVal: 0.2, type: "number" }],
    },
  ];

  constructor(container) {
    super(container);
    this.name = RotatingSpheres.name;
    this.group = null;
    this.spheres = [];
    this.geometry = null;
    this.material = null;
    this.state = {
      sphereCount: 4,
      orbitRadius: 2.5,
      sphereRadius: 0.6,
      detail: 16,
      color: "#fff0e1",
      wireframe: false,
      spinX: 0.01,
      spinY: 0.015,
      spinZ: 0,
    };
    this.init();
  }

  init() {
    if (!THREE) return;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.addLights();
    this.buildSpheres();
    this.setModel(this.group);
    this.setCustomAnimate(this.animateLoop.bind(this));
  }

  addLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 4, 6);
    this.scene.add(ambient);
    this.scene.add(key);
    this.lights = [ambient, key];
  }

  buildSpheres() {
    if (!this.group) return;
    this.clearSpheres();

    const detail = Math.max(8, Math.floor(Number(this.state.detail) || 8));
    this.geometry = new THREE.SphereGeometry(
      Math.max(0.1, Number(this.state.sphereRadius) || 0.1),
      detail,
      detail
    );
    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.state.color),
      roughness: 0.4,
      metalness: 0.1,
      wireframe: Boolean(this.state.wireframe),
    });

    const count = Math.max(1, Math.floor(Number(this.state.sphereCount) || 1));
    const radius = Number(this.state.orbitRadius) || 0;
    for (let i = 0; i < count; i++) {
      const sphere = new THREE.Mesh(this.geometry, this.material);
      const angle = (Math.PI * 2 * i) / count;
      sphere.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      this.group.add(sphere);
      this.spheres.push(sphere);
    }
  }

  clearSpheres() {
    this.spheres.forEach((sphere) => {
      this.group.remove(sphere);
    });
    this.spheres = [];
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }

  settings({
    sphereCount = 4,
    orbitRadius = 2.5,
    sphereRadius = 0.6,
    detail = 16,
    color = "#fff0e1",
    wireframe = false,
    spinX = 0.01,
    spinY = 0.015,
    spinZ = 0,
  } = {}) {
    this.state = {
      sphereCount: Math.max(1, Math.floor(Number(sphereCount) || 1)),
      orbitRadius: Number(orbitRadius) || 0,
      sphereRadius: Math.max(0.1, Number(sphereRadius) || 0.1),
      detail: Math.max(8, Math.floor(Number(detail) || 8)),
      color,
      wireframe: Boolean(wireframe),
      spinX: Number(spinX) || 0,
      spinY: Number(spinY) || 0,
      spinZ: Number(spinZ) || 0,
    };
    this.buildSpheres();
  }

  nudge({ amount = 0.2 } = {}) {
    const delta = Number(amount) || 0;
    this.group.rotation.y += delta;
  }

  animateLoop() {
    if (!this.group) return;
    this.group.rotation.x += this.state.spinX;
    this.group.rotation.y += this.state.spinY;
    this.group.rotation.z += this.state.spinZ;
  }

  destroy() {
    if (this.group) {
      this.clearSpheres();
      this.scene.remove(this.group);
    }
    if (this.lights) {
      this.lights.forEach((light) => this.scene.remove(light));
      this.lights = null;
    }
    this.group = null;
    super.destroy();
  }
}

export default RotatingSpheres;
