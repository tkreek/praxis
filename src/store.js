import { writable } from 'svelte/store';

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
})

//Data methods


let step = {}

step.add = () => {
  _data.update(data => {
    let steps = data.projects[0].blocks[0].steps
    let id = Date.now()
    let newStep = {
      id: id,
      text: "",
      isComplete: false
    };
    steps.unshift(newStep);
    return data
  });
}

step.delete = () => {
  _items.update(items => {
    items = items.filter(item => item.id !== id);
    return items
  });

}
export {_data, step}
