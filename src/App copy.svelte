<script>
  import { store_items } from "./data/store.js";


  import Items from '/components/Items.svelte'
  import Bulma from './components/Title.svelte';

  let items;

  const unsubscribe = store_items.subscribe(value => {
    items = value;
  });

  console.log("here are some items", items);

  function toggleComplete() {
    console.log(this.id);
    let id = this.id;

    store_items.update(items => {
      items.forEach(item => {
        if (item.id === id) {
          item.isComplete = !item.isComplete;
        }
      });
      items.sort((a, b) => (a.isComplete > b.isComplete ? 1 : -1));
      return items;
    });
  }

  function removeItem() {
    let id = this.parentElement.id;
    store_items.update(items => {
      items = items.filter(item => item.id !== id);
      return items;
    });
  }

  function sayHello() {
    alert("say hello");
  }
</script>

<style>
  .isComplete {
    text-decoration: line-through;
    color: grey;
  }

  button {
    border: none;
    background-color: white;
  }
</style>

<Bulma />

<section class="section">
  <div class="container">
  <Items/>
  </div>
</section>
