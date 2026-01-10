/*
@nwWrld name: PulseField
@nwWrld category: 2D
@nwWrld imports: ModuleBase, p5
*/

class PulseField extends ModuleBase {
  static methods = [
    {
      name: "settings",
      executeOnLoad: true,
      options: [
        { name: "cols", defaultVal: 50, type: "number" },
        { name: "rows", defaultVal: 50, type: "number" },
        { name: "dotMin", defaultVal: 3, type: "number" },
        { name: "dotMax", defaultVal: 14, type: "number" },
        { name: "frames", defaultVal: 120, type: "number" },
        { name: "speed", defaultVal: 1, type: "number" },
        { name: "colorA", defaultVal: "#F0BE41", type: "color" },
        { name: "colorB", defaultVal: "#5C496E", type: "color" },
        { name: "background", defaultVal: "#202020", type: "color" },
      ],
    },
    {
      name: "phase",
      executeOnLoad: false,
      options: [{ name: "offset", defaultVal: 0, type: "number" }],
    },
    {
      name: "pulse",
      executeOnLoad: false,
      options: [{ name: "amount", defaultVal: 1, type: "number" }],
    },
  ];

  constructor(container) {
    super(container);
    this.name = PulseField.name;
    this.myp5 = null;
    this.theta = 0;
    this.phaseOffset = 0;
    this.state = {
      cols: 50,
      rows: 50,
      dotMin: 3,
      dotMax: 14,
      frames: 120,
      speed: 1,
      colorA: "#F0BE41",
      colorB: "#5C496E",
      background: "#202020",
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
      };

      const drawLayer = (color, direction) => {
        const cols = Math.max(2, Math.floor(this.state.cols));
        const rows = Math.max(2, Math.floor(this.state.rows));
        const cellW = p.width / cols;
        const cellH = p.height / rows;
        const maxDist = Math.sqrt(
          Math.pow(p.width / 2, 2) + Math.pow(p.height / 2, 2)
        );

        p.fill(color);
        for (let i = 0; i < cols; i++) {
          const x = (i + 0.5) * cellW;
          for (let j = 0; j < rows; j++) {
            const y = (j + 0.5) * cellH;
            const distance = p.dist(x, y, p.width / 2, p.height / 2);
            const offSet = p.map(distance, 0, maxDist, 0, p.TWO_PI);
            const size = p.map(
              p.sin((this.theta + this.phaseOffset) * direction + offSet * 5),
              -1,
              1,
              this.state.dotMin,
              this.state.dotMax
            );
            p.ellipse(x, y, size, size);
          }
        }
      };

      p.draw = () => {
        const width = this.elem.clientWidth;
        const height = this.elem.clientHeight;
        if (p.width !== width || p.height !== height) {
          p.resizeCanvas(width, height);
        }

        p.background(this.state.background);
        drawLayer(this.state.colorA, 1);
        drawLayer(this.state.colorB, -1);

        const frames = Math.max(1, Number(this.state.frames) || 1);
        const speed = Number(this.state.speed) || 0;
        this.theta += (p.TWO_PI / frames) * speed;
      };
    };

    this.myp5 = new p5(sketch);
  }

  settings({
    cols = 50,
    rows = 50,
    dotMin = 3,
    dotMax = 14,
    frames = 120,
    speed = 1,
    colorA = "#F0BE41",
    colorB = "#5C496E",
    background = "#202020",
  } = {}) {
    this.state = {
      cols: Math.max(2, Math.floor(Number(cols) || 50)),
      rows: Math.max(2, Math.floor(Number(rows) || 50)),
      dotMin: Math.max(1, Number(dotMin) || 1),
      dotMax: Math.max(Number(dotMax) || 14, Number(dotMin) || 1),
      frames: Math.max(1, Math.floor(Number(frames) || 120)),
      speed: Number(speed) || 0,
      colorA,
      colorB,
      background,
    };
  }

  phase({ offset = 0 } = {}) {
    this.phaseOffset = Number(offset) || 0;
  }

  pulse({ amount = 1 } = {}) {
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

export default PulseField;
