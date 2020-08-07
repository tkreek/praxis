import { writable, derived } from 'svelte/store';

export const _items = writable([
    { id: '0001', isComplete: true, text: 'Create a list' },
    { id: '0002', isComplete: true, text: 'Create a very big list' },
    { id: '0003', isComplete: false, text: 'Make some dummy data' },
    { id: '0004', isComplete: false, text: 'Write css for completed item' },

]);


export const _completedItems = derived(
    _items,
    $_items => $_items.filter(item => item.isComplete)

);

export const _incompletedItems = derived(
    _items,
    $_items => $_items.filter(item => !item.isComplete)

);

