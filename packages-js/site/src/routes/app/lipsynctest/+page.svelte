<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import type { GlBuffer, GlContext, GlProgram } from '$lib/components/canvas/glcontext.js';
    import { Vec3 } from '$lib/math/vec3.js';
    import { LINE_FRAGMENT_SHADER, LIVE_VERTEX_SHADER } from './shader.js';
    import { Spectrum } from './spectrum.js';
    import { vowels } from './vowels.js';

    let spectrum: Spectrum;
    let loudness: number;
    let highestVowel = { key: '', value: 0 };
    let vowelScores: { key: string; value: number }[] = [];

    function updateScores(spectrum: Spectrum) {
        const vowelDotProduct: { [key: string]: number } = {};
        for (const [key, value] of vowels.entries()) {
            if (value) {
                vowelDotProduct[key] = spectrum.normalize().dot(value.normalize());
            } else {
                vowelDotProduct[key] = 0;
            }
        }

        const scores = Object.entries(vowelDotProduct)
            .map(([key, value]) => ({ key, value }))
            .sort((a, b) => b.value - a.value);
        const loudScore = 1 - 1 / (loudness + 1);
        if (scores.length !== 0) {
            {
                const max = scores[0].value;
                const min = scores[scores.length - 1].value;
                scores.forEach((score) => {
                    score.value = ((score.value - min) / (max - min)) * loudScore;
                });
            }
            if (scores.length >= 3) {
                const max = scores[0].value;
                const min = scores[2].value;
                scores.forEach((score) => {
                    score.value = Math.max(0, ((score.value - min) / (max - min)) * loudScore);
                });
            }
            const highest = scores[0];
            highestVowel = highest;
            vowelScores = scores;
        }
    }

    let analyzer: AnalyserNode;
    let program: GlProgram;
    let timeDomainArray: Float32Array;
    let frequencyArray: Float32Array;
    let timeDomainVbo: GlBuffer;
    let frequencyVbo: GlBuffer;

    async function init(glContext: GlContext) {
        const audioCtx = new AudioContext();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const input = audioCtx.createMediaStreamSource(stream);
        analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = Math.pow(2, 10);
        analyzer.smoothingTimeConstant = 0.7;
        input.connect(analyzer);

        glContext.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        program = glContext.createProgram([
            glContext.createShader(LIVE_VERTEX_SHADER),
            glContext.createShader(LINE_FRAGMENT_SHADER),
        ]);

        timeDomainArray = new Float32Array(analyzer.fftSize);
        frequencyArray = new Float32Array(analyzer.frequencyBinCount);
        timeDomainVbo = glContext.createBuffer();
        frequencyVbo = glContext.createBuffer();
        timeDomainVbo.bind(() => {
            timeDomainVbo.setData(timeDomainArray, 'dynamic');
        });
        frequencyVbo.bind(() => {
            frequencyVbo.setData(frequencyArray, 'dynamic');
        });
    }

    async function render(glContext: GlContext) {
        const { gl } = glContext;
        program.use(() => {
            const u_length = program.getUniform('u_length').asFloat();
            const u_minValue = program.getUniform('u_minValue').asFloat();
            const u_maxValue = program.getUniform('u_maxValue').asFloat();
            const u_color = program.getUniform('u_color').asVec3();
            u_length.set(timeDomainArray.length);
            u_minValue.set(-1.0);
            u_maxValue.set(1.0);
            u_color.set(new Vec3(1.0, 0.0, 0.0));

            analyzer.getFloatTimeDomainData(timeDomainArray);
            timeDomainVbo.bind(() => {
                timeDomainVbo.setSubData(timeDomainArray, 0);
                gl.enableVertexAttribArray(0);
                gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.LINE_STRIP, 0, timeDomainArray.length);
            });

            u_length.set(frequencyArray.length);
            u_minValue.set(analyzer.minDecibels);
            u_maxValue.set(analyzer.maxDecibels);
            u_color.set(new Vec3(0.0, 0.0, 1.0));

            analyzer.getFloatFrequencyData(frequencyArray);
            frequencyVbo.bind(() => {
                frequencyVbo.setSubData(frequencyArray, 0);
                gl.enableVertexAttribArray(0);
                gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.LINE_STRIP, 0, frequencyArray.length);
            });
        });

        loudness = timeDomainArray.reduce((acc, x) => acc + x * x, 0);
        spectrum = new Spectrum(frequencyArray.slice()).normalize();
        updateScores(spectrum);
    }

    function copy() {
        const lines = [] as string[];
        for (const [key, value] of vowels.entries()) {
            lines.push(`vowels.set('${key}', Spectrum.deserialize(\`${value.serialize()}\`));`);
        }
        document.addEventListener('click', async () => {
            await navigator.clipboard.writeText(lines.join('\n'));
        });
    }
</script>

<svelte:head>
    <title>Home</title>
    <meta name="description" content="Svelte demo app" />
</svelte:head>

<main>
    <Canvas init={(ctx) => init(ctx)} render={(ctx) => render(ctx)} />
    {#each vowels.keys() as key (key)}
        <div class="vowel">
            <div>
                {key}: {vowelScores.find((v) => v.key === key)?.value.toFixed(2)}
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={vowelScores.find((v) => v.key === key)?.value}
                />
            </div>
            <button
                onclick={() => {
                    vowels.set(key, spectrum);
                }}
            >
                set
            </button>
        </div>
    {/each}
    {#if highestVowel.value > 0.5}
        <div class="highest">
            {highestVowel.key}
        </div>
    {/if}
    <div>loudness: {loudness}</div>
    <button onclick={() => copy()}>copy</button>
</main>

<style lang="scss">
    main {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .highest {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 5rem;
    }

    .vowel {
        width: 100%;
        display: flex;
        justify-content: space-between;
        padding: 0 0.5rem;
    }
</style>
