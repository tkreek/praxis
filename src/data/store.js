import { writable } from 'svelte/store';

export const store_items = writable([
    {id:'0001', isComplete: true, text: 'Create a list'},
    {id:'0002', isComplete: false, text: 'Make some dummy data'},
    {id:'0003', isComplete: false, text: 'Write css for completed item'},



]);


