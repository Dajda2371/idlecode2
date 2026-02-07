const canvas = document.getElementById('turtle-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

// Resize canvas to fit container
function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resize);
resize();

class Turtle {
    constructor() {
        this.queue = [];
        this.x = 0;
        this.y = 0;
        this.angle = -90;
        this.penDown = true;
        this.color = 'black';
        this.width = 1;
        this.speed = 5;
        this.animating = false;
        this.stopFlag = false;
    }

    reset() {
        this.stopFlag = true;
        this.queue = [];
        this.animating = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.angle = -90; // Up
        this.penDown = true;
        this.color = 'black';
        this.width = 1;
        this.stopFlag = false;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    cmd(fn) {
        this.queue.push(fn);
        if (!this.animating) this.animate();
    }

    forward(dist) {
        this.cmd(() => {
            const rad = this.angle * Math.PI / 180;
            const newX = this.x + dist * Math.cos(rad);
            const newY = this.y + dist * Math.sin(rad);
            if (this.penDown) {
                ctx.beginPath();
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.width;
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(newX, newY);
                ctx.stroke();
            }
            this.x = newX;
            this.y = newY;
        });
    }

    backward(dist) { this.forward(-dist); }
    right(deg) { this.cmd(() => { this.angle += deg; }); }
    left(deg) { this.cmd(() => { this.angle -= deg; }); }
    penup() { this.cmd(() => { this.penDown = false; }); }
    pendown() { this.cmd(() => { this.penDown = true; }); }
    pencolor(c) { this.cmd(() => { this.color = c; }); }
    pensize(w) { this.cmd(() => { this.width = w; }); }
    goto(x, y) {
        this.cmd(() => {
            const newX = canvas.width / 2 + x; // offset from center
            const newY = canvas.height / 2 - y; // invert Y for cartesian
            if (this.penDown) {
                ctx.beginPath();
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.width;
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(newX, newY);
                ctx.stroke();
            }
            this.x = newX;
            this.y = newY;
        });
    }

    animate() {
        if (this.stopFlag) return;
        this.animating = true;
        requestAnimationFrame(() => {
            if (this.stopFlag) return;
            for (let i = 0; i < this.speed; i++) {
                const fn = this.queue.shift();
                if (fn) fn();
            }
            if (this.queue.length > 0) {
                this.animate();
            } else {
                this.animating = false;
            }
        });
    }

    stop() {
        this.stopFlag = true;
        this.queue = [];
        this.animating = false;
    }
}

const t = new Turtle();

const examples = {
    'star': () => {
        t.reset();
        t.pensize(2);
        t.pencolor('red');
        for (let i = 0; i < 36; i++) {
            t.forward(200);
            t.left(170);
        }
    },
    'spiral': () => {
        t.reset();
        t.pensize(2);
        t.pencolor('blue');
        for (let i = 0; i < 200; i++) {
            t.forward(i * 2);
            t.right(90);
            // Change color roughly every loop
            if (i % 20 === 0) t.pencolor(`hsl(${i * 10}, 100%, 50%)`);
        }
    },
    'tree': () => {
        t.reset();
        t.pensize(2);
        t.pencolor('green');

        // Move to bottom center
        t.penup();
        t.goto(0, -180);
        t.pendown();
        t.angle = -90; // Face up (default is -90)

        const drawBranch = (len) => {
            if (len < 10) {
                t.pencolor('pink'); // flowers
                t.pensize(4);
                t.forward(len);
                t.backward(len);
                t.pensize(2);
                t.pencolor('brown');
                return;
            }
            t.pencolor('brown');
            t.forward(len);
            t.left(30);
            drawBranch(len * 0.7);
            t.right(60);
            drawBranch(len * 0.7);
            t.left(30);
            t.backward(len);
        };
        drawBranch(100);
    },
    'clock': () => {
        t.reset();
        t.pensize(3);
        t.pencolor('black');

        // Draw face
        for (let i = 0; i < 60; i++) {
            t.penup();
            t.forward(150);
            t.pendown();
            if (i % 5 === 0) {
                t.pensize(4);
                t.forward(20);
                t.backward(20);
            } else {
                t.pensize(1);
                t.forward(10);
                t.backward(10);
            }
            t.penup();
            t.backward(150);
            t.right(6);
        }
    }
};

const list = document.getElementById('example-list');
let currentDemo = 'star';

Object.keys(examples).forEach(name => {
    const div = document.createElement('div');
    div.className = 'example-item';
    div.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    div.onclick = () => {
        document.querySelectorAll('.example-item').forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        document.getElementById('demo-title').textContent = 'Demo: ' + name;
        currentDemo = name;
        examples[name]();
    };
    list.appendChild(div);
});

// Select first
list.firstChild.click();

document.getElementById('start-btn').onclick = () => examples[currentDemo]();
document.getElementById('stop-btn').onclick = () => t.stop();
document.getElementById('clear-btn').onclick = () => { t.reset(); t.stop(); };
