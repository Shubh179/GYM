const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exercises = Array.from({ length: 7 }, (_, i) => ({ slug: `leg-${i}`, name: `Leg ${i}` }));
let state = { favourites: [], workouts: [{ id: 'legs', name: 'Legs', exercises }], progress: {}, completions: {}, sessionLog: {}, workoutHistory: {}, notes: {} };
let value;
let hook = 0;
const react = {
  createContext: () => ({ Provider: 'provider' }),
  useState: () => hook++ === 0 ? [state, update => { state = typeof update === 'function' ? update(state) : update; }] : [true, () => {}],
  useEffect: () => {}, useCallback: fn => fn, useMemo: fn => fn(),
};
const source = ts.transpileModule(fs.readFileSync('src/lib/library.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const sandbox = { exports: {}, require: name => name === 'react' ? react : { jsx: (_, props) => { value = props.value; } } };
vm.runInNewContext(source, sandbox);
function render() { hook = 0; sandbox.exports.LibraryProvider({ children: null }); }
render(); value.toggleSessionComplete('legs'); render();
assert.equal(Object.keys(state.completions).length, 0, 'Empty sessions must not be recorded');
for (let i = 0; i < 5; i++) { value.toggleExerciseDone('legs', exercises[i].slug); render(); }
value.toggleSessionComplete('legs'); render();
const day = sandbox.exports.dateToKey();
assert.equal(state.completions[day], 1);
assert.deepEqual(Array.from(state.workoutHistory[day][0].exercises, ex => ex.slug), exercises.slice(0, 5).map(ex => ex.slug));
assert.equal(state.workouts[0].exercises.length, 7);
value.toggleSessionComplete('legs'); render();
assert.equal(state.completions[day], undefined);
assert.equal(state.progress.legs.length, 5, 'Undo restores performed exercises');
value.toggleSessionComplete('legs'); render();
assert.equal(state.workoutHistory[day][0].exercises.length, 5);
value.toggleSessionComplete('legs'); render();
for (let i = 5; i < 7; i++) { value.toggleExerciseDone('legs', exercises[i].slug); render(); }
assert.equal(state.workoutHistory[day][0].exercises.length, 7, 'All exercises still auto-complete');
assert.equal(state.completions[day], 1);
console.log('PASS partial completion, grid log, empty-session guard, undo, and full completion');
