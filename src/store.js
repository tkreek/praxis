import { writable, derived } from 'svelte/store';

export const _state = writable ({
  projectID: '',
  blockID: 'b0',
  pomodoro:1
})



export const _blocks = writable([
  {
    id: 'b0', 
    isComplete: true, 
    text: 'Mockup the interface', 
    expectedPom: 6, 
    completedPom: 0, 
    steps: [
      { id: '1', isComplete: true, text: 'Font selection'},
      { id: '2', isComplete: true, text: 'List design'},
      { id: '3', isComplete: false, text: 'Key components' },
      { id: '4', isComplete: false, text: 'Select all the colors' },]
  },
  {
    id: 'b1', 
    isComplete: true, 
    text: 'Layout the data structure', 
    expectedPom: 2, 
    completedPom: 0, 
    steps: [
      { id: '1', isComplete: true, text: 'Blocks' },
      { id: '2', isComplete: true, text: 'Steps' },
      { id: '3', isComplete: false, text: 'Projects' },
      { id: '4', isComplete: false, text: 'Pomodors' },]
  },
  {
    id: 'b2', 
    isComplete: true, 
    text: 'One more for good measure', 
    expectedPom: 2, 
    completedPom: 0, 
    steps: [
      { id: '1', isComplete: true, text: 'Cut the shit' },
      { id: '2', isComplete: true, text: 'Go fuck yourself' },
      { id: '3', isComplete: false, text: 'Suck a dick' },]
  },

]);

export const _projects = writable([])
export const _pomodors = writable([])


//Data methods

function _updateState (stateType, data) {
  console.log(data)
  if (stateType === 'projectID') {

  } else if (stateType === 'blockID') {
    _state.update(state => {
      state.blockID = data 
      return state
    })
  } else {
  
  }

} 



//TODO - GET THIS SUBSCRIPTION WORKING
function _addItem(currentBlock) {
  _blocks.update(blocks => {
    blocks.forEach(block => {
      if(block.id == currentBlock) {
        let id = block.steps.length
        let newItem = {
          id: id,
          text: "",
          isComplete: false
        };
        block.steps.unshift(newItem);
      }
    })
    return blocks
  });
}

function _deleteItem(id) {
  _block.update(items => {
    console.log(id)
    items = items.filter(item => item.id != id);
    return items
  });

}
export { _addItem, _deleteItem, _updateState }
