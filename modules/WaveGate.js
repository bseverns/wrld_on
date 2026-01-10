/*
@nwWrld name: WaveGate
@nwWrld category: 2D
@nwWrld imports: ModuleBase, p5
*/

class WaveGate extends ModuleBase {
  static methods = [
    {
      name: "settings",
      executeOnLoad: true,
      options: [
        { name: "cols", defaultVal: 75, type: "number" },
        { name: "edge", defaultVal: 50, type: "number" },
        { name: "frames", defaultVal: 60, type: "number" },
        { name: "speed", defaultVal: 1, type: "number" },
        { name: "bandStart", defaultVal: 0.3, type: "number" },
        { name: "bandEnd", defaultVal: 0.7, type: "number" },
        { name: "baseScale", defaultVal: 0.4, type: "number" },
        { name: "pulseScale", defaultVal: 0.8, type: "number" },
        { name: "baseColor", defaultVal: "#646464", type: "color" },
        { name: "pulseColor", defaultVal: "#ffffff", type: "color" },
        { name: "background", defaultVal: "#141414", type: "color" },
      ],
    },
    {
      name: "nudge",
      executeOnLoad: false,
      options: [{ name: "amount", defaultVal: 1, type: "number" }],
    },
  ];

  constructor(container) {
    super(container);
    this.name = WaveGate.name;
    this.myp5 = null;
    this.theta = 0;
    this.state = {
      cols: 75,
      edge: 50,
      frames: 60,
      speed: 1,
      bandStart: 0.3,
      bandEnd: 0.7,
      baseScale: 0.4,
      pulseScale: 0.8,
      baseColor: "#646464",
      pulseColor: "#ffffff",
      background: "#141414",
    };
    this.init();
  }

  init() {
    if (!p5) return;
    const sketch = (p) => {
      this.myp5 = p;

      p.setup = () => {
        const width = this.elem.clientWidth;
        const height = this.elem.clientHeight;
        this.canvas = p.createCanvas(width, height);
        this.canvas.parent(this.elem);
        p.noStroke();
        p.rectMode(p.CENTER);
      };

      p.draw = () => {
        const width = this.elem.clientWidth;
        const height = this.elem.clientHeight;
        if (p.width !== width || p.height !== height) {
          p.resizeCanvas(width, height);
        }

        const cols = Math.max(2, Math.floor(this.state.cols));
        const edge = Math.max(0, Number(this.state.edge) || 0);
        const step = (p.width - 2 * edge) / cols;
        const baseScale = Math.max(0, Number(this.state.baseScale) || 0);
        const pulseScale = Math.max(0, Number(this.state.pulseScale) || 0);

        const bandStart = Math.min(
          1,
          Math.max(0, Number(this.state.bandStart) || 0)
        );
        const bandEnd = Math.min(
          1,
          Math.max(bandStart, Number(this.state.bandEnd) || 0)
        );
        const bandMinX = bandStart * p.width;
        const bandMaxX = bandEnd * p.width;

        p.background(this.state.background);

        let i = 0;
        for (let x = edge; x <= p.width - edge; x += step) {
          for (let y = edge; y <= p.height - edge; y += step) {
            p.fill(this.state.baseColor);
            const baseSize = step * baseScale;
            p.rect(x, p.height - y, baseSize, baseSize);

            const offSet = (p.TWO_PI / cols) * i;
            const endY = p.map(
              p.sin(this.theta + offSet),
              -1,
              1,
              edge,
              p.height - edge + step
            );

            if (x >= bandMinX && x <= bandMaxX && y <= endY) {
              p.fill(this.state.pulseColor);
              const pulseSize = step * pulseScale;
              p.ellipse(x, p.height - y, pulseSize, pulseSize);
            }
          }
          i += 1;
        }

        const frames = Math.max(1, Number(this.state.frames) || 1);
        const speed = Number(this.state.speed) || 0;
        this.theta += (p.TWO_PI / frames) * speed;
      };
    };

    this.myp5 = new p5(sketch);
  }

  settings({
    cols = 75,
    edge = 50,
    frames = 60,
    speed = 1,
    bandStart = 0.3,
    bandEnd = 0.7,
    baseScale = 0.4,
    pulseScale = 0.8,
    baseColor = "#646464",
    pulseColor = "#ffffff",
    background = "#141414",
  } = {}) {
    const safeBandStart = Math.min(1, Math.max(0, Number(bandStart) || 0));
    const safeBandEnd = Math.min(
      1,
      Math.max(safeBandStart, Number(bandEnd) || 0)
    );

    this.state = {
      cols: Math.max(2, Math.floor(Number(cols) || 75)),
      edge: Math.max(0, Number(edge) || 0),
      frames: Math.max(1, Math.floor(Number(frames) || 60)),
      speed: Number(speed) || 0,
      bandStart: safeBandStart,
      bandEnd: safeBandEnd,
      baseScale: Math.max(0, Number(baseScale) || 0),
      pulseScale: Math.max(0, Number(pulseScale) || 0),
      baseColor,
      pulseColor,
      background,
    };
  }

  nudge({ amount = 1 } = {}) {
    this.theta += Number(amount) || 0;
  }

  destroy() {
    if (this.myp5) {
      this.myp5.remove();
      this.myp5 = null;
    }
    super.destroy();
  }
}

export default WaveGate;
