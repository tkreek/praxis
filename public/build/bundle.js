
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
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

    const _data = writable ({
      user: 'Thomas Kreek',
      projects: [
        {
          id: 'p1',
          name: 'Project one',
          description: 'Take over the world',
          isComplete: false,
          archived: false,
          blocks: [
            {
              id: 'b1',
              description: 'block one',
              isComplete: false,
              timeEst: 0,
              timeComp: 0,
              steps: [
                {
                  id: 's1',
                  text: 'block one - step one',
                  isComplete: false,
                },
                {
                  id: 's2',
                  text: 'block one - step two',
                  isComplete: false,
                },
              ]
            },
            {
              id: 'b2',
              description: 'block two',
              isComplete: false,
              timeEst: 0,
              timeComp: 0,
              steps: [
                {
                  id: 's1',
                  text: 'block two - step two',
                  isComplete: 'false',
                },
                {
                  id: 's2',
                  text: 'block two -step two',
                  isComplete: 'false',
                },
              ]
            }

          ]

        }
      ]
    });

    //Data methods


    let step = {};

    step.add = () => {
      _data.update(data => {
        let steps = data.projects[0].blocks[0].steps;
        let id = Date.now();
        let newStep = {
          id: id,
          text: "",
          isComplete: false
        };
        steps.unshift(newStep);
        return data
      });
    };

    step.delete = () => {
      _items.update(items => {
        items = items.filter(item => item.id !== id);
        return items
      });

    };

    /* src/StepHeader.svelte generated by Svelte v3.24.0 */

    const { console: console_1 } = globals;
    const file = "src/StepHeader.svelte";

    function create_fragment(ctx) {
    	let section;
    	let h1;
    	let t0;
    	let t1;
    	let span;
    	let p;
    	let t3;
    	let div;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let option5;
    	let t10;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h1 = element("h1");
    			t0 = text(/*stepTitle*/ ctx[1]);
    			t1 = space();
    			span = element("span");
    			p = element("p");
    			p.textContent = "Estimated Time:";
    			t3 = space();
    			div = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "🍅 X 1";
    			option1 = element("option");
    			option1.textContent = "🍅 X 2";
    			option2 = element("option");
    			option2.textContent = "🍅 X 3";
    			option3 = element("option");
    			option3.textContent = "🍅 X 4";
    			option4 = element("option");
    			option4.textContent = "🍅 X 5";
    			option5 = element("option");
    			option5.textContent = "🍅 X 6";
    			t10 = space();
    			button = element("button");
    			button.textContent = "New Item +";
    			attr_dev(h1, "class", "title is-4");
    			add_location(h1, file, 29, 2, 392);
    			add_location(p, file, 31, 4, 445);
    			option0.__value = "1";
    			option0.value = option0.__value;
    			add_location(option0, file, 34, 8, 534);
    			option1.__value = "2";
    			option1.value = option1.__value;
    			add_location(option1, file, 35, 8, 574);
    			option2.__value = "3";
    			option2.value = option2.__value;
    			add_location(option2, file, 36, 8, 614);
    			option3.__value = "4";
    			option3.value = option3.__value;
    			add_location(option3, file, 37, 8, 654);
    			option4.__value = "5";
    			option4.value = option4.__value;
    			add_location(option4, file, 38, 8, 694);
    			option5.__value = "6";
    			option5.value = option5.__value;
    			add_location(option5, file, 39, 8, 734);
    			attr_dev(select, "class", "svelte-1yvhnyl");
    			if (/*poms*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[3].call(select));
    			add_location(select, file, 33, 6, 499);
    			attr_dev(div, "class", "select");
    			add_location(div, file, 32, 4, 472);
    			attr_dev(span, "class", "svelte-1yvhnyl");
    			add_location(span, file, 30, 2, 434);
    			attr_dev(button, "class", "button");
    			add_location(button, file, 44, 2, 806);
    			attr_dev(section, "class", "svelte-1yvhnyl");
    			add_location(section, file, 28, 0, 380);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h1);
    			append_dev(h1, t0);
    			append_dev(section, t1);
    			append_dev(section, span);
    			append_dev(span, p);
    			append_dev(span, t3);
    			append_dev(span, div);
    			append_dev(div, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(select, option4);
    			append_dev(select, option5);
    			select_option(select, /*poms*/ ctx[0]);
    			append_dev(section, t10);
    			append_dev(section, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[3]),
    					listen_dev(button, "click", /*addItem*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*stepTitle*/ 2) set_data_dev(t0, /*stepTitle*/ ctx[1]);

    			if (dirty & /*poms*/ 1) {
    				select_option(select, /*poms*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
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

    function instance($$self, $$props, $$invalidate) {
    	function addItem() {
    		console.log(this);
    		step.add();
    	}

    	let { stepTitle = "Placeholder title goes here" } = $$props;
    	let { poms = 1 } = $$props;
    	const writable_props = ["stepTitle", "poms"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<StepHeader> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("StepHeader", $$slots, []);

    	function select_change_handler() {
    		poms = select_value(this);
    		$$invalidate(0, poms);
    	}

    	$$self.$set = $$props => {
    		if ("stepTitle" in $$props) $$invalidate(1, stepTitle = $$props.stepTitle);
    		if ("poms" in $$props) $$invalidate(0, poms = $$props.poms);
    	};

    	$$self.$capture_state = () => ({ step, addItem, stepTitle, poms });

    	$$self.$inject_state = $$props => {
    		if ("stepTitle" in $$props) $$invalidate(1, stepTitle = $$props.stepTitle);
    		if ("poms" in $$props) $$invalidate(0, poms = $$props.poms);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*poms*/ 1) {
    			 console.log(poms);
    		}
    	};

    	return [poms, stepTitle, addItem, select_change_handler];
    }

    class StepHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { stepTitle: 1, poms: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "StepHeader",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get stepTitle() {
    		throw new Error("<StepHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stepTitle(value) {
    		throw new Error("<StepHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get poms() {
    		throw new Error("<StepHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set poms(value) {
    		throw new Error("<StepHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Step.svelte generated by Svelte v3.24.0 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/Step.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "🗑";
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "svelte-e4ipf");
    			toggle_class(input0, "hidden", /*hidden*/ ctx[3]);
    			add_location(input0, file$1, 55, 2, 775);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", /*placeholder*/ ctx[4]);
    			input1.value = /*text*/ ctx[1];
    			attr_dev(input1, "class", "svelte-e4ipf");
    			toggle_class(input1, "complete", /*isComplete*/ ctx[0]);
    			add_location(input1, file$1, 56, 2, 842);
    			attr_dev(button, "class", "svelte-e4ipf");
    			toggle_class(button, "hidden", /*hidden*/ ctx[3]);
    			add_location(button, file$1, 57, 2, 921);
    			attr_dev(div, "class", "task");
    			attr_dev(div, "id", /*id*/ ctx[2]);
    			add_location(div, file$1, 50, 0, 683);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			input0.checked = /*isComplete*/ ctx[0];
    			append_dev(div, t0);
    			append_dev(div, input1);
    			append_dev(div, t1);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[6]),
    					listen_dev(button, "click", deleteItem, false, false, false),
    					listen_dev(div, "mouseenter", /*toggleHidden*/ ctx[5], false, false, false),
    					listen_dev(div, "mouseleave", /*toggleHidden*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*isComplete*/ 1) {
    				input0.checked = /*isComplete*/ ctx[0];
    			}

    			if (dirty & /*hidden*/ 8) {
    				toggle_class(input0, "hidden", /*hidden*/ ctx[3]);
    			}

    			if (dirty & /*text*/ 2 && input1.value !== /*text*/ ctx[1]) {
    				prop_dev(input1, "value", /*text*/ ctx[1]);
    			}

    			if (dirty & /*isComplete*/ 1) {
    				toggle_class(input1, "complete", /*isComplete*/ ctx[0]);
    			}

    			if (dirty & /*hidden*/ 8) {
    				toggle_class(button, "hidden", /*hidden*/ ctx[3]);
    			}

    			if (dirty & /*id*/ 4) {
    				attr_dev(div, "id", /*id*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
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

    function deleteItem() {
    	_deleteItem(this.parentElement.id);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { isComplete = false } = $$props;
    	let { text = "" } = $$props;
    	let { id = "0001" } = $$props;
    	let placeholder = "Describe the step...";
    	let hidden = true;

    	//Visual
    	function toggleHidden() {
    		$$invalidate(3, hidden = !hidden);
    	}

    	const writable_props = ["isComplete", "text", "id"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Step> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Step", $$slots, []);

    	function input0_change_handler() {
    		isComplete = this.checked;
    		$$invalidate(0, isComplete);
    	}

    	$$self.$set = $$props => {
    		if ("isComplete" in $$props) $$invalidate(0, isComplete = $$props.isComplete);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({
    		step,
    		isComplete,
    		text,
    		id,
    		placeholder,
    		hidden,
    		toggleHidden,
    		deleteItem
    	});

    	$$self.$inject_state = $$props => {
    		if ("isComplete" in $$props) $$invalidate(0, isComplete = $$props.isComplete);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    		if ("placeholder" in $$props) $$invalidate(4, placeholder = $$props.placeholder);
    		if ("hidden" in $$props) $$invalidate(3, hidden = $$props.hidden);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isComplete*/ 1) {
    			 console.log(isComplete);
    		}
    	};

    	return [isComplete, text, id, hidden, placeholder, toggleHidden, input0_change_handler];
    }

    class Step extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { isComplete: 0, text: 1, id: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Step",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get isComplete() {
    		throw new Error("<Step>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isComplete(value) {
    		throw new Error("<Step>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<Step>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Step>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Step>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Step>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Block.svelte generated by Svelte v3.24.0 */

    const { console: console_1$2 } = globals;
    const file$2 = "src/Block.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let p;
    	let t3;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			p = element("p");
    			p.textContent = `${displayPoms()}`;
    			t3 = space();
    			button = element("button");
    			button.textContent = "🗑";
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "svelte-1vimsss");
    			toggle_class(input0, "hidden", /*hidden*/ ctx[3]);
    			add_location(input0, file$2, 67, 2, 913);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", /*placeholder*/ ctx[4]);
    			input1.value = /*text*/ ctx[1];
    			attr_dev(input1, "class", "svelte-1vimsss");
    			toggle_class(input1, "complete", /*isComplete*/ ctx[0]);
    			add_location(input1, file$2, 68, 2, 980);
    			add_location(p, file$2, 69, 2, 1059);
    			attr_dev(button, "class", "svelte-1vimsss");
    			toggle_class(button, "hidden", /*hidden*/ ctx[3]);
    			add_location(button, file$2, 70, 2, 1084);
    			attr_dev(div, "class", "block svelte-1vimsss");
    			attr_dev(div, "id", /*id*/ ctx[2]);
    			add_location(div, file$2, 62, 0, 820);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			input0.checked = /*isComplete*/ ctx[0];
    			append_dev(div, t0);
    			append_dev(div, input1);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(div, t3);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[6]),
    					listen_dev(button, "click", deleteItem$1, false, false, false),
    					listen_dev(div, "mouseenter", /*toggleHidden*/ ctx[5], false, false, false),
    					listen_dev(div, "mouseleave", /*toggleHidden*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*isComplete*/ 1) {
    				input0.checked = /*isComplete*/ ctx[0];
    			}

    			if (dirty & /*hidden*/ 8) {
    				toggle_class(input0, "hidden", /*hidden*/ ctx[3]);
    			}

    			if (dirty & /*text*/ 2 && input1.value !== /*text*/ ctx[1]) {
    				prop_dev(input1, "value", /*text*/ ctx[1]);
    			}

    			if (dirty & /*isComplete*/ 1) {
    				toggle_class(input1, "complete", /*isComplete*/ ctx[0]);
    			}

    			if (dirty & /*hidden*/ 8) {
    				toggle_class(button, "hidden", /*hidden*/ ctx[3]);
    			}

    			if (dirty & /*id*/ 4) {
    				attr_dev(div, "id", /*id*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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

    function deleteItem$1() {
    	_deleteItem(this.parentElement.id);
    }

    function displayPoms() {
    	let poms = "🍅🍅🍅🍅";
    	return poms;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { isComplete = false } = $$props;
    	let { text = "" } = $$props;
    	let { id = "0001" } = $$props;
    	let placeholder = "Describe the step...";
    	let hidden = true;

    	//Visual
    	function toggleHidden() {
    		$$invalidate(3, hidden = !hidden);
    	}

    	const writable_props = ["isComplete", "text", "id"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<Block> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Block", $$slots, []);

    	function input0_change_handler() {
    		isComplete = this.checked;
    		$$invalidate(0, isComplete);
    	}

    	$$self.$set = $$props => {
    		if ("isComplete" in $$props) $$invalidate(0, isComplete = $$props.isComplete);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({
    		step,
    		isComplete,
    		text,
    		id,
    		placeholder,
    		hidden,
    		toggleHidden,
    		deleteItem: deleteItem$1,
    		displayPoms
    	});

    	$$self.$inject_state = $$props => {
    		if ("isComplete" in $$props) $$invalidate(0, isComplete = $$props.isComplete);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    		if ("placeholder" in $$props) $$invalidate(4, placeholder = $$props.placeholder);
    		if ("hidden" in $$props) $$invalidate(3, hidden = $$props.hidden);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isComplete*/ 1) {
    			 console.log(isComplete);
    		}
    	};

    	return [isComplete, text, id, hidden, placeholder, toggleHidden, input0_change_handler];
    }

    class Block extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { isComplete: 0, text: 1, id: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Block",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get isComplete() {
    		throw new Error("<Block>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isComplete(value) {
    		throw new Error("<Block>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<Block>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Block>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Block>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Block>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.0 */

    const { console: console_1$3 } = globals;
    const file$3 = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	child_ctx[4] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[4] = i;
    	return child_ctx;
    }

    // (28:8) {#each $_data.projects[0].blocks as block, i}
    function create_each_block_1(ctx) {
    	let block;
    	let current;
    	const block_spread_levels = [/*block*/ ctx[5]];
    	let block_props = {};

    	for (let i = 0; i < block_spread_levels.length; i += 1) {
    		block_props = assign(block_props, block_spread_levels[i]);
    	}

    	block = new Block({ props: block_props, $$inline: true });

    	const block_1 = {
    		c: function create() {
    			create_component(block.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(block, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const block_changes = (dirty & /*$_data*/ 1)
    			? get_spread_update(block_spread_levels, [get_spread_object(/*block*/ ctx[5])])
    			: {};

    			block.$set(block_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(block.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(block.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(block, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block: block_1,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(28:8) {#each $_data.projects[0].blocks as block, i}",
    		ctx
    	});

    	return block_1;
    }

    // (38:8) {#each $_data.projects[0].blocks[0].steps as step, i}
    function create_each_block(ctx) {
    	let step;
    	let current;
    	const step_spread_levels = [/*step*/ ctx[2]];
    	let step_props = {};

    	for (let i = 0; i < step_spread_levels.length; i += 1) {
    		step_props = assign(step_props, step_spread_levels[i]);
    	}

    	step = new Step({ props: step_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(step.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(step, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const step_changes = (dirty & /*$_data*/ 1)
    			? get_spread_update(step_spread_levels, [get_spread_object(/*step*/ ctx[2])])
    			: {};

    			step.$set(step_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(step.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(step.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(step, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(38:8) {#each $_data.projects[0].blocks[0].steps as step, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div4;
    	let div1;
    	let section0;
    	let div0;
    	let t0;
    	let div3;
    	let section1;
    	let div2;
    	let stepheader;
    	let t1;
    	let current;
    	let each_value_1 = /*$_data*/ ctx[0].projects[0].blocks;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	stepheader = new StepHeader({ $$inline: true });
    	let each_value = /*$_data*/ ctx[0].projects[0].blocks[0].steps;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div1 = element("div");
    			section0 = element("section");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t0 = space();
    			div3 = element("div");
    			section1 = element("section");
    			div2 = element("div");
    			create_component(stepheader.$$.fragment);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "container");
    			add_location(div0, file$3, 26, 6, 466);
    			attr_dev(section0, "class", "section");
    			add_location(section0, file$3, 25, 4, 434);
    			attr_dev(div1, "class", "column");
    			add_location(div1, file$3, 24, 2, 409);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$3, 35, 6, 687);
    			attr_dev(section1, "class", "section");
    			add_location(section1, file$3, 34, 4, 655);
    			attr_dev(div3, "class", "column");
    			add_location(div3, file$3, 33, 2, 630);
    			attr_dev(div4, "class", "columns");
    			add_location(div4, file$3, 23, 0, 385);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, section0);
    			append_dev(section0, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, section1);
    			append_dev(section1, div2);
    			mount_component(stepheader, div2, null);
    			append_dev(div2, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$_data*/ 1) {
    				each_value_1 = /*$_data*/ ctx[0].projects[0].blocks;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*$_data*/ 1) {
    				each_value = /*$_data*/ ctx[0].projects[0].blocks[0].steps;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			transition_in(stepheader.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			transition_out(stepheader.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks_1, detaching);
    			destroy_component(stepheader);
    			destroy_each(each_blocks, detaching);
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
    	let $_data;
    	validate_store(_data, "_data");
    	component_subscribe($$self, _data, $$value => $$invalidate(0, $_data = $$value));
    	let cheese = $_data.projects[0].id;
    	console.log(cheese);
    	cheese = "p11";
    	set_store_value(_data, $_data.projects[0].id = "p12", $_data);
    	console.log(cheese);
    	console.log($_data.projects[0].id);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$3.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		_data,
    		StepHeader,
    		Step,
    		Block,
    		cheese,
    		$_data
    	});

    	$$self.$inject_state = $$props => {
    		if ("cheese" in $$props) cheese = $$props.cheese;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$_data];
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
