const { spawn } = require('child_process');

const py = spawn('python3', ['-u', '-i']);

let buffer = '';

py.stdout.on('data', (d) => {
    console.log('STDOUT:', JSON.stringify(d.toString()));
});

py.stderr.on('data', (d) => {
    const s = d.toString();
    console.log('STDERR:', JSON.stringify(s));
    buffer += s;
    if (buffer.endsWith('>>> ')) {
        console.log('PROMPT DETECTED: >>>');
        buffer = '';
    } else if (buffer.endsWith('... ')) {
        console.log('PROMPT DETECTED: ...');
        buffer = '';
    }
});

py.stdin.write('def fn():\n');
setTimeout(() => {
    py.stdin.write('print("a")\n');
    setTimeout(() => {
        py.stdin.write('\n'); // end block
        py.kill();
    }, 1000);
}, 1000);
