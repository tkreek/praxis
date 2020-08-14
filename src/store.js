import { writable } from 'svelte/store';

export const _items = writable([
  { id: '0001', isComplete: true, text: 'Create a list' },
  { id: '0002', isComplete: true, text: 'Create a very big list' },
  { id: '0003', isComplete: false, text: 'Make some dummy data' },
  { id: '0004', isComplete: false, text: 'Write css for completed item' },

]);

//Data methods

function _addItem() {
  _items.update(items => {
    let id = items.length
    let newItem = {
      id: id,
      text: "",
      isComplete: false
    };
    items.unshift(newItem);
    return items
  });
}

function _deleteItem(id) {
  _items.update(items => {
    items = items.filter(item => item.id !== id);
    return items
  });

}
export { _addItem, _deleteItem }
