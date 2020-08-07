
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function fix_and_destroy_block(block, lookup) {
        block.f();
        destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const _items = writable([
        { id: '0001', isComplete: true, text: 'Create a list' },
        { id: '0002', isComplete: true, text: 'Create a very big list' },
        { id: '0003', isComplete: false, text: 'Make some dummy data' },
        { id: '0004', isComplete: false, text: 'Write css for completed item' },

    ]);


    const _completedItems = derived(
        _items,
        $_items => $_items.filter(item => item.isComplete)

    );

    const _incompletedItems = derived(
        _items,
        $_items => $_items.filter(item => !item.isComplete)

    );

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /**
     * Gets the absolute bounding rect (accounts for the window's scroll position)
     * @param {HTMLElement }el
     * @return {{top: number, left: number, bottom: number, right: number}}
     */
    function getAbsoluteRect(el) {
        const rect = el.getBoundingClientRect();
        return ({
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            right: rect.right + window.scrollX
        });
    }

    /**
     * finds the center :)
     * @typedef {Object} Rect
     * @property {number} top
     * @property {number} bottom
     * @property {number} left
     * @property {number} right
     * @param {Rect} rect
     * @return {{x: number, y: number}}
     */
    function findCenter(rect) {
        return ({
            x: (rect.left + rect.right) /2,
            y: (rect.top + rect.bottom) /2
        });    
    }

    /**
     * @typedef {Object} Point
     * @property {number} x
     * @property {number} y
     * @param {Point} pointA
     * @param {Point} pointB
     * @return {number}
     */
    function calcDistance(pointA, pointB) {
        return Math.sqrt(Math.pow(pointA.x - pointB.x, 2) +  Math.pow(pointA.y - pointB.y, 2));
    }

    /**
     * @param {Point} point
     * @param {Rect} rect
     * @return {boolean|boolean}
     */
    function isPointInsideRect(point, rect) {
        return (
            (point.y <= rect.bottom && point.y >= rect.top)
            &&
            (point.x >= rect.left && point.x <= rect.right)
        );
    }

    /**
     * find the absolute coordinates of the center of a dom element
     * @param el {HTMLElement}
     * @returns {{x: number, y: number}}
     */
    function findCenterOfElement(el) {
        return findCenter( getAbsoluteRect(el));
    }

    /**
     * @param {HTMLElement} elA
     * @param {HTMLElement} elB
     * @return {boolean}
     */
    function isCenterOfAInsideB(elA, elB) {
        const centerOfA = findCenterOfElement(elA);
        const rectOfB = getAbsoluteRect(elB);
        return isPointInsideRect(centerOfA, rectOfB);
    }

    /**
     * @param {HTMLElement|ChildNode} elA
     * @param {HTMLElement|ChildNode} elB
     * @return {number}
     */
    function calcDistanceBetweenCenters(elA, elB) {
        const centerOfA = findCenterOfElement(elA);
        const centerOfB = findCenterOfElement(elB);
        return calcDistance(centerOfA, centerOfB);
    }

    /**
     * @param {HTMLElement} el - the element to check
     * @returns {boolean} - true if the element in its entirety is off screen including the scrollable area (the normal dom events look at the mouse rather than the element)
     */
    function isElementOffDocument(el) {
        const rect = getAbsoluteRect(el);
        return rect.right < 0 || rect.left > document.documentElement.scrollWidth || rect.bottom < 0 || rect.top > document.documentElement.scrollHeight;
    }

    /**
     * If the point is inside the element returns its distances from the sides, otherwise returns null
     * @param {Point} point
     * @param {HTMLElement} el
     * @return {null|{top: number, left: number, bottom: number, right: number}}
     */
    function calcInnerDistancesBetweenPointAndSidesOfElement(point, el) {
        const rect = getAbsoluteRect(el);
        if (!isPointInsideRect(point, rect)) {
            return null;
        }
        return {
            top: point.y - rect.top,
            bottom: rect.bottom - point.y,
            left: point.x - rect.left,
            // TODO - figure out what is so special about right (why the rect is too big)
            right: Math.min(rect.right, document.documentElement.clientWidth) - point.x
        }
    }

    /**
     * @typedef {Object} Index
     * @property {number} index - the would be index
     * @property {boolean} isProximityBased - false if the element is actually over the index, true if it is not over it but this index is the closest
     */
    /**
     * Find the index for the dragged element in the list it is dragged over
     * @param {HTMLElement} floatingAboveEl 
     * @param {HTMLElement} collectionBelowEl 
     * @returns {Index|null} -  if the element is over the container the Index object otherwise null
     */
    function findWouldBeIndex(floatingAboveEl, collectionBelowEl) {
        if (!isCenterOfAInsideB(floatingAboveEl, collectionBelowEl)) {
            return null;
        }
        const children = collectionBelowEl.children;
        // the container is empty, floating element should be the first 
        if (children.length === 0) {
            return {index: 0, isProximityBased: true};
        }
        // the search could be more efficient but keeping it simple for now
        // a possible improvement: pass in the lastIndex it was found in and check there first, then expand from there
        for (let i=0; i< children.length; i++) {
            if (isCenterOfAInsideB(floatingAboveEl, children[i])) {
                return {index: i, isProximityBased: false};
            }
        }
        // this can happen if there is space around the children so the floating element has 
        //entered the container but not any of the children, in this case we will find the nearest child
        let minDistanceSoFar = Number.MAX_VALUE;
        let indexOfMin = undefined;
        // we are checking all of them because we don't know whether we are dealing with a horizontal or vertical container and where the floating element entered from
        for (let i=0; i< children.length; i++) {
            const distance = calcDistanceBetweenCenters(floatingAboveEl, children[i]);
            if (distance < minDistanceSoFar) {
                minDistanceSoFar = distance;
                indexOfMin = i;
            }
        }
        return {index: indexOfMin, isProximityBased: true};
    }

    // external events
    const FINALIZE_EVENT_NAME = 'finalize';
    const CONSIDER_EVENT_NAME = 'consider';

    function dispatchFinalizeEvent(el, items) {
        el.dispatchEvent(new CustomEvent(FINALIZE_EVENT_NAME, {
            detail: {items}
        }));
    }

    function dispatchConsiderEvent(el, items) {
        el.dispatchEvent(new CustomEvent(CONSIDER_EVENT_NAME, {
            detail: {items}
        }));
    }

    // internal events
    const DRAGGED_ENTERED_EVENT_NAME = 'draggedentered';
    const DRAGGED_LEFT_EVENT_NAME = 'draggedleft';
    const DRAGGED_OVER_INDEX_EVENT_NAME = 'draggedoverindex';
    const DRAGGED_LEFT_DOCUMENT_EVENT_NAME = 'draggedleftdocument';
    function dispatchDraggedElementEnteredContainer(containerEl, indexObj, draggedEl) {
        containerEl.dispatchEvent(new CustomEvent(DRAGGED_ENTERED_EVENT_NAME, {
            detail: {indexObj, draggedEl}
        }));
    }
    function dispatchDraggedElementLeftContainer(containerEl, draggedEl) {
        containerEl.dispatchEvent(new CustomEvent(DRAGGED_LEFT_EVENT_NAME, {
            detail: {draggedEl}
        }));
    }
    function dispatchDraggedElementIsOverIndex(containerEl, indexObj, draggedEl) {
        containerEl.dispatchEvent(new CustomEvent(DRAGGED_OVER_INDEX_EVENT_NAME, {
            detail: {indexObj, draggedEl}
        }));
    }
    function dispatchDraggedLeftDocument(draggedEl) {
        window.dispatchEvent(new CustomEvent(DRAGGED_LEFT_DOCUMENT_EVENT_NAME, {
            detail: { draggedEl}
        }));
    }

    const SCROLL_ZONE_PX = 25;

    function makeScroller() {
        let scrollingInfo;
        function resetScrolling() {
            scrollingInfo = {directionObj: undefined, stepPx: 0};
        }
        resetScrolling();
        // directionObj {x: 0|1|-1, y:0|1|-1} - 1 means down in y and right in x
        function scrollContainer(containerEl) {
            const {directionObj, stepPx} = scrollingInfo;
            if(directionObj) {
                containerEl.scrollBy(directionObj.x * stepPx, directionObj.y * stepPx);
                window.requestAnimationFrame(() => scrollContainer(containerEl));
            }
        }
        function calcScrollStepPx(distancePx) {
            return SCROLL_ZONE_PX - distancePx;
        }

        /**
         * If the pointer is next to the sides of the element to scroll, will trigger scrolling
         * Can be called repeatedly with updated pointer and elementToScroll values without issues
         * @return {boolean} - true if scrolling was needed
         */
        function scrollIfNeeded(pointer, elementToScroll) {
            if (!elementToScroll) {
                return false;
            }
            const distances = calcInnerDistancesBetweenPointAndSidesOfElement(pointer, elementToScroll);
            if (distances === null) {
                resetScrolling();
                return false;
            }
            const isAlreadyScrolling = !!scrollingInfo.directionObj;
            let [scrollingVertically, scrollingHorizontally] = [false, false];
            // vertical
            if (elementToScroll.scrollHeight > elementToScroll.clientHeight) {
                if (distances.bottom < SCROLL_ZONE_PX) {
                    scrollingVertically = true;
                    scrollingInfo.directionObj = {x:0, y:1};
                    scrollingInfo.stepPx = calcScrollStepPx(distances.bottom);
                } else if (distances.top < SCROLL_ZONE_PX) {
                    scrollingVertically = true;
                    scrollingInfo.directionObj = {x:0, y:-1};
                    scrollingInfo.stepPx = calcScrollStepPx(distances.top);
                }
                if (!isAlreadyScrolling && scrollingVertically) {
                    scrollContainer(elementToScroll);
                    return true;
                }
            }
            // horizontal
            if (elementToScroll.scrollWidth > elementToScroll.clientWidth) {
                if (distances.right < SCROLL_ZONE_PX) {
                    scrollingHorizontally = true;
                    scrollingInfo.directionObj = {x:1, y:0};
                    scrollingInfo.stepPx = calcScrollStepPx(distances.right);
                } else if (distances.left < SCROLL_ZONE_PX) {
                    scrollingHorizontally = true;
                    scrollingInfo.directionObj = {x:-1, y:0};
                    scrollingInfo.stepPx = calcScrollStepPx(distances.left);
                }
                if (!isAlreadyScrolling && scrollingHorizontally){
                    scrollContainer(elementToScroll);
                    return true;
                }
            }
            resetScrolling();
            return false;
        }

        return ({
            scrollIfNeeded,
            resetScrolling
        });
    }

    const INTERVAL_MS = 200;
    const TOLERANCE_PX = 10;
    const {scrollIfNeeded, resetScrolling} = makeScroller();
    let next;


    /**
     * Tracks the dragged elements and performs the side effects when it is dragged over a drop zone (basically dispatching custom-events scrolling)
     * @param {Set<HTMLElement>} dropZones 
     * @param {HTMLElement} draggedEl 
     * @param {number} [intervalMs = INTERVAL_MS]
     */
    function observe(draggedEl, dropZones, intervalMs = INTERVAL_MS) {
        // initialization
        let lastDropZoneFound;
        let lastIndexFound;
        let lastIsDraggedInADropZone = false;
        let lastCentrePositionOfDragged;

        /**
         * The main function in this module. Tracks where everything is/ should be a take the actions
         */
        function andNow() {
            const currentCenterOfDragged = findCenterOfElement(draggedEl);
            const scrolled = scrollIfNeeded(currentCenterOfDragged, lastDropZoneFound);
            // we only want to make a new decision after the element was moved a bit to prevent flickering
            if (!scrolled && lastCentrePositionOfDragged &&
                Math.abs(lastCentrePositionOfDragged.x - currentCenterOfDragged.x) < TOLERANCE_PX &&
                Math.abs(lastCentrePositionOfDragged.y - currentCenterOfDragged.y) < TOLERANCE_PX ) {
                next = window.setTimeout(andNow, intervalMs);
                return;
            }
            if (isElementOffDocument(draggedEl)) {
                console.debug("off document");
                dispatchDraggedLeftDocument(draggedEl);
                return;
            }

            lastCentrePositionOfDragged = currentCenterOfDragged;
            // this is a simple algorithm, potential improvement: first look at lastDropZoneFound
            let isDraggedInADropZone = false;
            for (const dz of dropZones) {
                const indexObj = findWouldBeIndex(draggedEl, dz);
                if (indexObj === null) {
                   // it is not inside
                   continue;     
                }
                const {index} = indexObj;
                isDraggedInADropZone = true;
                // the element is over a container
                if (dz !== lastDropZoneFound) {
                    lastDropZoneFound && dispatchDraggedElementLeftContainer(lastDropZoneFound, draggedEl);
                    dispatchDraggedElementEnteredContainer(dz, indexObj, draggedEl);
                    lastDropZoneFound = dz;
                    lastIndexFound = index;
                }
                else if (index !== lastIndexFound) {
                    dispatchDraggedElementIsOverIndex(dz, indexObj, draggedEl);
                    lastIndexFound = index;
                }
                // we handle looping with the 'continue' statement above
                break;
            }
            // the first time the dragged element is not in any dropzone we need to notify the last dropzone it was in
            if (!isDraggedInADropZone && lastIsDraggedInADropZone && lastDropZoneFound) {
                dispatchDraggedElementLeftContainer(lastDropZoneFound, draggedEl);
                lastDropZoneFound = undefined;
                lastIndexFound = undefined;
                lastIsDraggedInADropZone = false;
            } else {
                lastIsDraggedInADropZone = true;
            }
            next = window.setTimeout(andNow, intervalMs);
        }
        andNow();
    }

    // assumption - we can only observe one dragged element at a time, this could be changed in the future
    function unobserve() {
        console.debug("unobserving");
        clearTimeout(next);
        resetScrolling();
    }

    const INTERVAL_MS$1 = 300;
    let mousePosition;

    /**
     * Do not use this! it is visible for testing only until we get over the issue Cypress not triggering the mousemove listeners
     * // TODO - make private (remove export)
     * @param {{clientX: number, clientY: number}} e
     */
    function updateMousePosition(e) {
        const c = e.touches? e.touches[0] : e;
        mousePosition = {x: c.clientX, y: c.clientY};
    }
    const {scrollIfNeeded: scrollIfNeeded$1, resetScrolling: resetScrolling$1} = makeScroller();
    let next$1;

    function loop$1() {
        if (mousePosition) {
            scrollIfNeeded$1(mousePosition, document.documentElement);
        }
        next$1 = window.setTimeout(loop$1, INTERVAL_MS$1);
    }

    /**
     * will start watching the mouse pointer and scroll the window if it goes next to the edges
     */
    function armWindowScroller() {
        console.debug('arming window scroller');
        window.addEventListener('mousemove', updateMousePosition);
        window.addEventListener('touchmove', updateMousePosition);
        loop$1();
    }

    /**
     * will stop watching the mouse pointer and won't scroll the window anymore
     */
    function disarmWindowScroller() {
        console.debug('disarming window scroller');
        window.removeEventListener('mousemove', updateMousePosition);
        window.removeEventListener('touchmove', updateMousePosition);
        mousePosition = undefined;
        window.clearTimeout(next$1);
        resetScrolling$1();
    }

    const TRANSITION_DURATION_SECONDS = 0.2;

    /**
     * private helper function - creates a transition string for a property
     * @param {string} property
     * @return {string} - the transition string
     */
    function trs(property) {
        return `${property} ${TRANSITION_DURATION_SECONDS}s ease`;
    }
    /**
     * clones the given element and applies proper styles and transitions to the dragged element
     * @param {HTMLElement} originalElement
     * @return {Node} - the cloned, styled element
     */
    function createDraggedElementFrom(originalElement) {
        const rect = originalElement.getBoundingClientRect();
        const draggedEl = originalElement.cloneNode(true);
        draggedEl.id = `svelte-dnd-action-dragged-el`;
        draggedEl.name = `svelte-dnd-action-dragged-el`;
        draggedEl.style.position = "fixed";
        draggedEl.style.top = `${rect.top}px`;
        draggedEl.style.left = `${rect.left}px`;
        draggedEl.style.margin = '0';
        // we can't have relative or automatic height and width or it will break the illusion
        draggedEl.style.boxSizing = 'border-box';
        draggedEl.style.height = `${rect.height}px`;
        draggedEl.style.width = `${rect.width}px`;
        draggedEl.style.transition = `${trs('width')}, ${trs('height')}, ${trs('background-color')}, ${trs('opacity')}, ${trs('color')} `;
        // this is a workaround for a strange browser bug that causes the right border to disappear when all the transitions are added at the same time
        window.setTimeout(() => draggedEl.style.transition +=`, ${trs('top')}, ${trs('left')}`,0);
        draggedEl.style.zIndex = '9999';
        draggedEl.style.cursor = 'grabbing';
        return draggedEl;
    }

    /**
     * styles the dragged element to a 'dropped' state
     * @param {HTMLElement} draggedEl
     */
    function moveDraggedElementToWasDroppedState(draggedEl) {
        draggedEl.style.cursor = 'grab';
    }

    /**
     * Morphs the dragged element style, maintains the mouse pointer within the element
     * @param {HTMLElement} draggedEl
     * @param {HTMLElement} copyFromEl - the element the dragged element should look like, typically the shadow element
     * @param {number} currentMouseX
     * @param {number} currentMouseY
     */
    function morphDraggedElementToBeLike(draggedEl, copyFromEl, currentMouseX, currentMouseY) {
        const newRect = copyFromEl.getBoundingClientRect();
        const draggedElRect = draggedEl.getBoundingClientRect();
        const widthChange = newRect.width - draggedElRect.width;
        const heightChange = newRect.height - draggedElRect.height;
        if (widthChange || heightChange) {
            const relativeDistanceOfMousePointerFromDraggedSides = {
                left: (currentMouseX - draggedElRect.left) / draggedElRect.width,
                top: (currentMouseY - draggedElRect.top) / draggedElRect.height
            };
            draggedEl.style.height = `${newRect.height}px`;
            draggedEl.style.width = `${newRect.width}px`;
            draggedEl.style.left = `${parseFloat(draggedEl.style.left) - relativeDistanceOfMousePointerFromDraggedSides.left * widthChange}px`;
            draggedEl.style.top = `${parseFloat(draggedEl.style.top) - relativeDistanceOfMousePointerFromDraggedSides.top * heightChange}px`;
        }

        /// other properties
        const computedStyle = window.getComputedStyle(copyFromEl);
        Array.from(computedStyle)
            .filter(s => s.startsWith('background') || s.startsWith('padding') || s.startsWith('font') || s.startsWith('text') || s.startsWith('align') ||
            s.startsWith('justify') || s.startsWith('display') || s.startsWith('flex') || s.startsWith('border') || s === 'opacity' || s === 'color')
            .forEach(s =>
                draggedEl.style.setProperty(s, computedStyle.getPropertyValue(s), computedStyle.getPropertyPriority(s))
            );
    }

    /**
     * makes the element compatible with being draggable
     * @param {HTMLElement} draggableEl
     * @param {boolean} dragDisabled
     */
    function styleDraggable(draggableEl, dragDisabled) {
        draggableEl.draggable = false;
        draggableEl.ondragstart = () => false;
        if (!dragDisabled) {
            draggableEl.style.userSelect = 'none';
            draggableEl.style.cursor = 'grab';
        }
        else {
            draggableEl.style.userSelect = '';
            draggableEl.style.cursor = '';
        }
    }

    /**
     * Hides the provided element so that it can stay in the dom without interrupting
     * @param {HTMLElement} dragTarget
     */
    function hideOriginalDragTarget(dragTarget) {
        dragTarget.style.display = 'none';
        dragTarget.style.position = 'fixed';
        dragTarget.style.zIndex = '-5';
    }

    /**
     * styles the shadow element
     * @param {HTMLElement} shadowEl
     */
    function styleShadowEl(shadowEl) {
        shadowEl.style.visibility = "hidden";
    }

    /**
     * will mark the given dropzones as visually active
     * @param {Array<HTMLElement>} dropZones
     * @param {Function} getStyles - maps a dropzone to a styles object (so the styles can be removed)
     */
    function styleActiveDropZones(dropZones, getStyles = () => {}) {
        dropZones.forEach(dz => {
            const styles = getStyles(dz);
            Object.keys(styles).forEach(style => {
                dz.style[style] = styles[style];
            });
        });
    }

    /**
     * will remove the 'active' styling from given dropzones
     * @param {Array<HTMLElement>} dropZones
     * @param {Function} getStyles - maps a dropzone to a styles object
     */
    function styleInActiveDropZones(dropZones, getStyles = () => {}) {
        dropZones.forEach(dz => {
            const styles = getStyles(dz);
            Object.keys(styles).forEach(style => {
                dz.style[style] = '';
            });
        });
    }

    const ITEM_ID_KEY = "id";
    const DEFAULT_DROP_ZONE_TYPE = '--any--';
    const MIN_OBSERVATION_INTERVAL_MS = 100;
    const MIN_MOVEMENT_BEFORE_DRAG_START_PX = 3;
    const DEFAULT_DROP_TARGET_STYLE = {
        outline: 'rgba(255, 255, 102, 0.7) solid 2px',
    };

    let originalDragTarget;
    let draggedEl;
    let draggedElData;
    let draggedElType;
    let originDropZone;
    let originIndex;
    let shadowElIdx;
    let shadowElData;
    let shadowElDropZone;
    let dragStartMousePosition;
    let currentMousePosition;
    let isWorkingOnPreviousDrag = false;

    // a map from type to a set of drop-zones
    const typeToDropZones = new Map();
    // important - this is needed because otherwise the config that would be used for everyone is the config of the element that created the event listeners
    const dzToConfig = new Map();
    // this is needed in order to be able to cleanup old listeners and avoid stale closures issues (as the listener is defined within each zone)
    const elToMouseDownListener = new WeakMap();

    /* drop-zones registration management */
    function registerDropZone(dropZoneEl, type) {
        console.debug('registering drop-zone if absent');
        if (!typeToDropZones.has(type)) {
            typeToDropZones.set(type, new Set());
        }
        if (!typeToDropZones.get(type).has(dropZoneEl)) {
            typeToDropZones.get(type).add(dropZoneEl); 
        }
    }
    function unregisterDropZone(dropZoneEl, type) {
        typeToDropZones.get(type).delete(dropZoneEl);
        if (typeToDropZones.get(type).size === 0) {
            typeToDropZones.delete(type);
        }
    }

    /* functions to manage observing the dragged element and trigger custom drag-events */
    function watchDraggedElement() {
        console.debug('watching dragged element');
        armWindowScroller();
        const dropZones = typeToDropZones.get(draggedElType);
        for (const dz of dropZones) {
            dz.addEventListener(DRAGGED_ENTERED_EVENT_NAME, handleDraggedEntered);
            dz.addEventListener(DRAGGED_LEFT_EVENT_NAME, handleDraggedLeft);
            dz.addEventListener(DRAGGED_OVER_INDEX_EVENT_NAME, handleDraggedIsOverIndex);
        }
        window.addEventListener(DRAGGED_LEFT_DOCUMENT_EVENT_NAME, handleDrop);
        // it is important that we don't have an interval that is faster than the flip duration because it can cause elements to jump bach and forth
        const observationIntervalMs = Math.max(MIN_OBSERVATION_INTERVAL_MS, ...Array.from(dropZones.keys()).map(dz => dzToConfig.get(dz).dropAnimationDurationMs));
        observe(draggedEl, dropZones, observationIntervalMs * 1.07);
    }
    function unWatchDraggedElement() {
        console.debug('unwatching dragged element');
        disarmWindowScroller();
        const dropZones = typeToDropZones.get(draggedElType);
        for (const dz of dropZones) {
            dz.removeEventListener(DRAGGED_ENTERED_EVENT_NAME, handleDraggedEntered);
            dz.removeEventListener(DRAGGED_LEFT_EVENT_NAME, handleDraggedLeft);
            dz.removeEventListener(DRAGGED_OVER_INDEX_EVENT_NAME, handleDraggedIsOverIndex);
        }
        window.removeEventListener(DRAGGED_LEFT_DOCUMENT_EVENT_NAME, handleDrop);
        unobserve();
    }

    /* custom drag-events handlers */
    function handleDraggedEntered(e) {
        console.debug('dragged entered', e.currentTarget, e.detail);
        let {items, dropFromOthersDisabled} = dzToConfig.get(e.currentTarget);
        if (dropFromOthersDisabled && e.currentTarget !== originDropZone) {
            console.debug('drop is currently disabled');
            return;
        }
        // this deals with another svelte related race condition. in rare occasions (super rapid operations) the list hasn't updated yet
        items = items.filter(i => i.id !== shadowElData.id);
        console.debug(`dragged entered items ${JSON.stringify(items)}`);
        const {index, isProximityBased} = e.detail.indexObj;
        shadowElIdx = (isProximityBased && index === e.currentTarget.children.length - 1)? index + 1 : index;
        shadowElDropZone = e.currentTarget;
        items.splice( shadowElIdx, 0, shadowElData);
        dispatchConsiderEvent(e.currentTarget, items);
    }
    function handleDraggedLeft(e) {
        console.debug('dragged left', e.currentTarget, e.detail);
        const {items, dropFromOthersDisabled} = dzToConfig.get(e.currentTarget);
        if (dropFromOthersDisabled && e.currentTarget !== originDropZone) {
            console.debug('drop is currently disabled');
            return;
        }
        items.splice(shadowElIdx, 1);
        shadowElIdx = undefined;
        shadowElDropZone = undefined;
        dispatchConsiderEvent(e.currentTarget, items);
    }
    function handleDraggedIsOverIndex(e) {
        console.debug('dragged is over index', e.currentTarget, e.detail);
        const {items, dropFromOthersDisabled} = dzToConfig.get(e.currentTarget);
        if (dropFromOthersDisabled && e.currentTarget !== originDropZone) {
            console.debug('drop is currently disabled');
            return;
        }
        const {index} = e.detail.indexObj;
        items.splice(shadowElIdx, 1);
        items.splice( index, 0, shadowElData);
        shadowElIdx = index;
        dispatchConsiderEvent(e.currentTarget, items);
    }

    /* global mouse/touch-events handlers */
    function handleMouseMove(e) {
        e.preventDefault();
        const c = e.touches? e.touches[0] : e;
        currentMousePosition = {x: c.clientX, y: c.clientY};
        draggedEl.style.transform = `translate3d(${currentMousePosition.x - dragStartMousePosition.x}px, ${currentMousePosition.y - dragStartMousePosition.y}px, 0)`;
    }

    function handleDrop() {
        console.debug('dropped');
        // cleanup
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('mouseup', handleDrop);
        window.removeEventListener('touchend', handleDrop);
        unWatchDraggedElement();
        moveDraggedElementToWasDroppedState(draggedEl);
        if (!!shadowElDropZone) { // it was dropped in a drop-zone
            console.debug('dropped in dz', shadowElDropZone);
            let {items, type} = dzToConfig.get(shadowElDropZone);
            styleInActiveDropZones(typeToDropZones.get(type), dz => dzToConfig.get(dz).dropTargetStyle);
            items = items.map(item => item.hasOwnProperty('isDndShadowItem')? draggedElData : item);
            function finalizeWithinZone() {
                dispatchFinalizeEvent(shadowElDropZone, items);
                if (shadowElDropZone !== originDropZone) {
                    // letting the origin drop zone know the element was permanently taken away
                    dispatchFinalizeEvent(originDropZone, dzToConfig.get(originDropZone).items);
                }
                shadowElDropZone.children[shadowElIdx].style.visibility = '';
                cleanupPostDrop();
            }
            animateDraggedToFinalPosition(finalizeWithinZone);
        }
        else { // it needs to return to its place
            console.debug('no dz available');
            let {items, type} = dzToConfig.get(originDropZone);
            styleInActiveDropZones(typeToDropZones.get(type), dz => dzToConfig.get(dz).dropTargetStyle);
            items.splice(originIndex, 0, shadowElData);
            shadowElDropZone = originDropZone;
            shadowElIdx = originIndex;
            dispatchConsiderEvent(originDropZone, items);
            function finalizeBackToOrigin() {
                items.splice(originIndex, 1, draggedElData);
                dispatchFinalizeEvent(originDropZone, items);
                shadowElDropZone.children[shadowElIdx].style.visibility = '';
                cleanupPostDrop();
            }
            window.setTimeout(() => animateDraggedToFinalPosition(finalizeBackToOrigin), 0);
        }
    }

    // helper function for handleDrop
    function animateDraggedToFinalPosition(callback) {
        const shadowElRect = shadowElDropZone.children[shadowElIdx].getBoundingClientRect();
        const newTransform = {
            x: shadowElRect.left - parseFloat(draggedEl.style.left),
            y: shadowElRect.top - parseFloat(draggedEl.style.top)
        };
        const {dropAnimationDurationMs} = dzToConfig.get(shadowElDropZone);
        const transition = `transform ${dropAnimationDurationMs}ms ease`;
        draggedEl.style.transition = draggedEl.style.transition? draggedEl.style.transition + "," + transition : transition;
        draggedEl.style.transform = `translate3d(${newTransform.x}px, ${newTransform.y}px, 0)`;
        window.setTimeout(callback, dropAnimationDurationMs);
    }

    /* cleanup */
    function cleanupPostDrop() {
        draggedEl.remove();
        originalDragTarget.remove();
        draggedEl = undefined;
        originalDragTarget = undefined;
        draggedElData = undefined;
        draggedElType = undefined;
        originDropZone = undefined;
        originIndex = undefined;
        shadowElData = undefined;
        shadowElIdx = undefined;
        shadowElDropZone = undefined;
        dragStartMousePosition = undefined;
        currentMousePosition = undefined;
        isWorkingOnPreviousDrag = false;
    }

    /**
     * A Svelte custom action to turn any container to a dnd zone and all of its direct children to draggables
     * dispatches two events that the container is expected to react to by modifying its list of items,
     * which will then feed back in to this action via the update function
     *
     * @typedef {Object} Options
     * @property {Array} items - the list of items that was used to generate the children of the given node (the list used in the #each block
     * @property {string} [type] - the type of the dnd zone. children dragged from here can only be dropped in other zones of the same type, default to a base type
     * @property {number} [flipDurationMs] - if the list animated using flip (recommended), specifies the flip duration such that everything syncs with it without conflict, defaults to zero
     * @param {HTMLElement} node - the element to enhance
     * @param {Options} options
     * @return {{update: function, destroy: function}}
     */
    function dndzone(node, options) {
        const config =  {
            items: [],
            type: undefined,
            flipDurationMs: 0,
            dragDisabled: false,
            dropFromOthersDisabled: false,
            dropTargetStyle: DEFAULT_DROP_TARGET_STYLE,
        };
        console.debug("dndzone good to go", {node, options, config});
        let elToIdx = new Map();

        function addMaybeListeners() {
            window.addEventListener('mousemove', handleMouseMoveMaybeDragStart, {passive: false});
            window.addEventListener('touchmove', handleMouseMoveMaybeDragStart, {passive: false, capture: false});
            window.addEventListener('mouseup', handleFalseAlarm, {passive: false});
            window.addEventListener('touchend', handleFalseAlarm, {passive: false});
        }
        function removeMaybeListeners() {
            window.removeEventListener('mousemove', handleMouseMoveMaybeDragStart);
            window.removeEventListener('touchmove', handleMouseMoveMaybeDragStart);
            window.removeEventListener('mouseup', handleFalseAlarm);
            window.removeEventListener('touchend', handleFalseAlarm);
        }
        function handleFalseAlarm() {
            removeMaybeListeners();
            originalDragTarget = undefined;
            dragStartMousePosition = undefined;
            currentMousePosition = undefined;
        }

        function handleMouseMoveMaybeDragStart(e) {
            e.preventDefault();
            const c = e.touches? e.touches[0] : e;
            currentMousePosition = {x: c.clientX, y: c.clientY};
            if (Math.abs(currentMousePosition.x - dragStartMousePosition.x) >= MIN_MOVEMENT_BEFORE_DRAG_START_PX || Math.abs(currentMousePosition.y - dragStartMousePosition.y) >= MIN_MOVEMENT_BEFORE_DRAG_START_PX) {
                removeMaybeListeners();
                handleDragStart();
            }
        }
        function handleMouseDown(e) {
            if (isWorkingOnPreviousDrag) {
                console.debug('cannot start a new drag before finalizing previous one');
                return;
            }
            e.stopPropagation();
            const c = e.touches? e.touches[0] : e;
            dragStartMousePosition = {x: c.clientX, y:c.clientY};
            currentMousePosition = {...dragStartMousePosition};
            originalDragTarget = e.currentTarget;
            addMaybeListeners();
        }

        function handleDragStart() {
            console.debug('drag start', originalDragTarget, {config});
            isWorkingOnPreviousDrag = true;

            // initialising globals
            const currentIdx = elToIdx.get(originalDragTarget);
            originIndex = currentIdx;
            originDropZone = originalDragTarget.parentElement;
            const {items, type} = config;
            draggedElData = {...items[currentIdx]};
            draggedElType = type;
            shadowElData = {...draggedElData, isDndShadowItem: true};

            // creating the draggable element
            draggedEl = createDraggedElementFrom(originalDragTarget);
            // We will keep the original dom node in the dom because touch events keep firing on it, we want to re-add it after Svelte removes it
            function keepOriginalElementInDom() {
                const {items: itemsNow} = config;
                if (!draggedEl.parentElement && (!itemsNow[originIndex] || draggedElData[ITEM_ID_KEY] !== itemsNow[originIndex][ITEM_ID_KEY])) {
                    document.body.appendChild(draggedEl);
                    watchDraggedElement();
                    hideOriginalDragTarget(originalDragTarget);
                    document.body.appendChild(originalDragTarget);
                } else {
                    window.requestAnimationFrame(keepOriginalElementInDom);
                }
            }
            window.requestAnimationFrame(keepOriginalElementInDom);

            styleActiveDropZones(
                Array.from(typeToDropZones.get(config.type))
                .filter(dz => dz === originDropZone || !dzToConfig.get(dz).dropFromOthersDisabled),
                dz => dzToConfig.get(dz).dropTargetStyle,
            );

            // removing the original element by removing its data entry
            items.splice(currentIdx, 1);
            dispatchConsiderEvent(originDropZone, items);

            // handing over to global handlers - starting to watch the element
            window.addEventListener('mousemove', handleMouseMove, {passive: false});
            window.addEventListener('touchmove', handleMouseMove, {passive: false, capture: false});
            window.addEventListener('mouseup', handleDrop, {passive: false});
            window.addEventListener('touchend', handleDrop, {passive: false});
        }

        function configure({
            items = [],
            flipDurationMs:dropAnimationDurationMs = 0,
            type:newType = DEFAULT_DROP_ZONE_TYPE,
            dragDisabled = false,
            dropFromOthersDisabled = false,
            dropTargetStyle = DEFAULT_DROP_TARGET_STYLE,
             ...rest
         }) {
            if (Object.keys(rest).length > 0) {
                console.warn(`dndzone will ignore unknown options`, rest);
            }
            config.dropAnimationDurationMs = dropAnimationDurationMs;
            if (config.type && newType !== config.type) {
                unregisterDropZone(node, config.type);
            }
            config.type = newType;
            registerDropZone(node, newType);

            config.items = items;

            config.dragDisabled = dragDisabled;

            config.dropTargetStyle = dropTargetStyle;

            if (isWorkingOnPreviousDrag && config.dropFromOthersDisabled !== dropFromOthersDisabled) {
                if (dropFromOthersDisabled) {
                    styleInActiveDropZones([node], dz => dzToConfig.get(dz).dropTargetStyle);
                } else {
                    styleActiveDropZones([node], dz => dzToConfig.get(dz).dropTargetStyle);
                }
            }
            config.dropFromOthersDisabled = dropFromOthersDisabled;
            dzToConfig.set(node, config);
            for (let idx = 0; idx < node.children.length; idx++) {
                const draggableEl = node.children[idx];
                styleDraggable(draggableEl, dragDisabled);
                if (config.items[idx].hasOwnProperty('isDndShadowItem')) {
                    morphDraggedElementToBeLike(draggedEl, draggableEl, currentMousePosition.x, currentMousePosition.y);
                    styleShadowEl(draggableEl);
                    continue;
                }
                draggableEl.removeEventListener('mousedown', elToMouseDownListener.get(draggableEl));
                draggableEl.removeEventListener('touchstart', elToMouseDownListener.get(draggableEl));
                if (!dragDisabled) {
                    draggableEl.addEventListener('mousedown', handleMouseDown);
                    draggableEl.addEventListener('touchstart', handleMouseDown);
                    elToMouseDownListener.set(draggableEl, handleMouseDown);
                }
                // updating the idx
                elToIdx.set(draggableEl, idx);
            }
        }
        configure(options);

        return ({
            update: (newOptions) => {
                console.debug("dndzone will update", newOptions);
                configure(newOptions);
            },
            destroy: () => {
                console.debug("dndzone will destroy");
                unregisterDropZone(node, config.type);
                dzToConfig.delete(node);
            }
        });
    }

    /* src/components/ItemList.svelte generated by Svelte v3.24.0 */

    const { console: console_1 } = globals;
    const file = "src/components/ItemList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (73:2) {#each items as item (item.id)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let span0;
    	let t0_value = /*item*/ ctx[5].text + "";
    	let t0;
    	let t1;
    	let span1;
    	let button0;
    	let t3;
    	let span2;
    	let button1;
    	let t5;
    	let div_id_value;
    	let rect;
    	let stop_animation = noop;
    	let mounted;
    	let dispose;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			button0 = element("button");
    			button0.textContent = "🖋";
    			t3 = space();
    			span2 = element("span");
    			button1 = element("button");
    			button1.textContent = "🗑";
    			t5 = space();
    			attr_dev(span0, "class", "svelte-cpw4om");
    			toggle_class(span0, "completed", /*item*/ ctx[5].isComplete !== true);
    			add_location(span0, file, 74, 6, 1716);
    			attr_dev(button0, "class", "svelte-cpw4om");
    			add_location(button0, file, 80, 8, 1863);
    			add_location(span1, file, 79, 6, 1848);
    			attr_dev(button1, "class", "svelte-cpw4om");
    			add_location(button1, file, 83, 8, 1918);
    			add_location(span2, file, 82, 6, 1903);
    			attr_dev(div, "id", div_id_value = /*item*/ ctx[5].id);
    			attr_dev(div, "class", "svelte-cpw4om");
    			add_location(div, file, 73, 4, 1647);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, t0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, button0);
    			append_dev(div, t3);
    			append_dev(div, span2);
    			append_dev(span2, button1);
    			append_dev(div, t5);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span0, "click", /*toggleComplete*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*removeItem*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 1 && t0_value !== (t0_value = /*item*/ ctx[5].text + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*items*/ 1) {
    				toggle_class(span0, "completed", /*item*/ ctx[5].isComplete !== true);
    			}

    			if (dirty & /*items*/ 1 && div_id_value !== (div_id_value = /*item*/ ctx[5].id)) {
    				attr_dev(div, "id", div_id_value);
    			}
    		},
    		r: function measure() {
    			rect = div.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(div);
    			stop_animation();
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(div, rect, flip, { duration: flipDurationMs });
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(73:2) {#each items as item (item.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let section;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let dndzone_action;
    	let mounted;
    	let dispose;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[5].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(section, "class", "svelte-cpw4om");
    			add_location(section, file, 68, 0, 1489);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section, null);
    			}

    			if (!mounted) {
    				dispose = [
    					action_destroyer(dndzone_action = dndzone.call(null, section, { items: /*items*/ ctx[0], flipDurationMs })),
    					listen_dev(section, "consider", /*handleDndConsider*/ ctx[1], false, false, false),
    					listen_dev(section, "finalize", /*handleDndFinalize*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items, removeItem, toggleComplete*/ 25) {
    				const each_value = /*items*/ ctx[0];
    				validate_each_argument(each_value);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, section, fix_and_destroy_block, create_each_block, null, get_each_context);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    			}

    			if (dndzone_action && is_function(dndzone_action.update) && dirty & /*items*/ 1) dndzone_action.update.call(null, { items: /*items*/ ctx[0], flipDurationMs });
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const flipDurationMs = 300;

    function onHover() {
    	console.log(this);
    }

    function instance($$self, $$props, $$invalidate) {
    	let { items } = $$props;

    	function handleDndConsider(e) {
    		$$invalidate(0, items = e.detail.items);
    	}

    	function handleDndFinalize(e) {
    		$$invalidate(0, items = e.detail.items);
    	}

    	function removeItem() {
    		console.log("remove item was called");
    		let id = this.parentElement.parentElement.id;

    		_items.update(items => {
    			items = items.filter(item => item.id !== id);
    			return items;
    		});
    	}

    	function toggleComplete() {
    		let id = this.parentElement.id;

    		_items.update(items => {
    			items.forEach(item => {
    				if (item.id === id) {
    					item.isComplete = !item.isComplete;
    				}
    			});

    			console.log(items);
    			return items;
    		});
    	}

    	const writable_props = ["items"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<ItemList> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ItemList", $$slots, []);

    	$$self.$set = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	$$self.$capture_state = () => ({
    		_items,
    		flip,
    		dndzone,
    		items,
    		flipDurationMs,
    		handleDndConsider,
    		handleDndFinalize,
    		removeItem,
    		toggleComplete,
    		onHover
    	});

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [items, handleDndConsider, handleDndFinalize, removeItem, toggleComplete];
    }

    class ItemList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ItemList",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*items*/ ctx[0] === undefined && !("items" in props)) {
    			console_1.warn("<ItemList> was created without expected prop 'items'");
    		}
    	}

    	get items() {
    		throw new Error("<ItemList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<ItemList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Title.svelte generated by Svelte v3.24.0 */

    const file$1 = "src/components/Title.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div;
    	let h1;
    	let t1;
    	let p;
    	let t2;
    	let strong;
    	let t4;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Praxis";
    			t1 = space();
    			p = element("p");
    			t2 = text("Be more ");
    			strong = element("strong");
    			strong.textContent = "effective";
    			t4 = text("!");
    			attr_dev(h1, "class", "title");
    			add_location(h1, file$1, 2, 4, 56);
    			add_location(strong, file$1, 4, 14, 125);
    			attr_dev(p, "class", "subtitle");
    			add_location(p, file$1, 3, 4, 90);
    			attr_dev(div, "class", "container");
    			add_location(div, file$1, 1, 2, 28);
    			attr_dev(section, "class", "section");
    			add_location(section, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(p, strong);
    			append_dev(p, t4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Title> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Title", $$slots, []);
    	return [];
    }

    class Title extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Title",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/Sandbox.svelte generated by Svelte v3.24.0 */

    const { console: console_1$1 } = globals;
    const file$2 = "src/components/Sandbox.svelte";

    function create_fragment$2(ctx) {
    	let span;
    	let button;
    	let t0;
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			button = element("button");
    			t0 = space();
    			div = element("div");
    			div.textContent = "now you see me";
    			add_location(button, file$2, 23, 2, 239);
    			attr_dev(div, "class", "svelte-1wc0ob2");
    			toggle_class(div, "hidden", /*hidden*/ ctx[0] === true);
    			add_location(div, file$2, 24, 2, 310);
    			add_location(span, file$2, 21, 0, 229);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, button);
    			append_dev(span, t0);
    			append_dev(span, div);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "mouseenter", /*testFunction*/ ctx[1], false, false, false),
    					listen_dev(button, "mouseleave", /*testFunction*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*hidden*/ 1) {
    				toggle_class(div, "hidden", /*hidden*/ ctx[0] === true);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	function testFunction() {
    		console.log(this);
    		$$invalidate(0, hidden = !hidden);
    		console.log(hidden);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Sandbox> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Sandbox", $$slots, []);
    	$$self.$capture_state = () => ({ testFunction, hidden });

    	$$self.$inject_state = $$props => {
    		if ("hidden" in $$props) $$invalidate(0, hidden = $$props.hidden);
    	};

    	let hidden;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	 $$invalidate(0, hidden = true);
    	return [hidden, testFunction];
    }

    class Sandbox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sandbox",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.0 */
    const file$3 = "src/App.svelte";

    function create_fragment$3(ctx) {
    	let section0;
    	let div0;
    	let title;
    	let t0;
    	let sandbox;
    	let t1;
    	let section1;
    	let div1;
    	let h40;
    	let t3;
    	let itemlist0;
    	let t4;
    	let h41;
    	let t6;
    	let itemlist1;
    	let current;
    	title = new Title({ $$inline: true });
    	sandbox = new Sandbox({ $$inline: true });

    	itemlist0 = new ItemList({
    			props: { items: /*$_completedItems*/ ctx[0] },
    			$$inline: true
    		});

    	itemlist1 = new ItemList({
    			props: { items: /*$_incompletedItems*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			div0 = element("div");
    			create_component(title.$$.fragment);
    			t0 = space();
    			create_component(sandbox.$$.fragment);
    			t1 = space();
    			section1 = element("section");
    			div1 = element("div");
    			h40 = element("h4");
    			h40.textContent = "ToDo";
    			t3 = space();
    			create_component(itemlist0.$$.fragment);
    			t4 = space();
    			h41 = element("h4");
    			h41.textContent = "Complete";
    			t6 = space();
    			create_component(itemlist1.$$.fragment);
    			attr_dev(div0, "class", "container");
    			add_location(div0, file$3, 17, 2, 340);
    			attr_dev(section0, "class", "section");
    			add_location(section0, file$3, 16, 0, 312);
    			attr_dev(h40, "class", "title is-4");
    			add_location(h40, file$3, 27, 4, 472);
    			attr_dev(h41, "class", "title is-4");
    			add_location(h41, file$3, 29, 4, 551);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$3, 26, 2, 444);
    			attr_dev(section1, "class", "section");
    			add_location(section1, file$3, 25, 0, 416);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div0);
    			mount_component(title, div0, null);
    			append_dev(div0, t0);
    			mount_component(sandbox, div0, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div1);
    			append_dev(div1, h40);
    			append_dev(div1, t3);
    			mount_component(itemlist0, div1, null);
    			append_dev(div1, t4);
    			append_dev(div1, h41);
    			append_dev(div1, t6);
    			mount_component(itemlist1, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const itemlist0_changes = {};
    			if (dirty & /*$_completedItems*/ 1) itemlist0_changes.items = /*$_completedItems*/ ctx[0];
    			itemlist0.$set(itemlist0_changes);
    			const itemlist1_changes = {};
    			if (dirty & /*$_incompletedItems*/ 2) itemlist1_changes.items = /*$_incompletedItems*/ ctx[1];
    			itemlist1.$set(itemlist1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(title.$$.fragment, local);
    			transition_in(sandbox.$$.fragment, local);
    			transition_in(itemlist0.$$.fragment, local);
    			transition_in(itemlist1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(title.$$.fragment, local);
    			transition_out(sandbox.$$.fragment, local);
    			transition_out(itemlist0.$$.fragment, local);
    			transition_out(itemlist1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section0);
    			destroy_component(title);
    			destroy_component(sandbox);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(section1);
    			destroy_component(itemlist0);
    			destroy_component(itemlist1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $_completedItems;
    	let $_incompletedItems;
    	validate_store(_completedItems, "_completedItems");
    	component_subscribe($$self, _completedItems, $$value => $$invalidate(0, $_completedItems = $$value));
    	validate_store(_incompletedItems, "_incompletedItems");
    	component_subscribe($$self, _incompletedItems, $$value => $$invalidate(1, $_incompletedItems = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		_items,
    		_completedItems,
    		_incompletedItems,
    		ItemList,
    		Title,
    		Sandbox,
    		$_completedItems,
    		$_incompletedItems
    	});

    	return [$_completedItems, $_incompletedItems];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
