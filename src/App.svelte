<script>
  //data
  import { _data } from "./store.js";

  import StepHeader from "./StepHeader.svelte";
  import Step from "./Step.svelte";
  import Block from "./Block.svelte"

  let cheese = $_data.projects[0].id;

  console.log(cheese);

  cheese = "p11";

  $_data.projects[0].id = "p12";
  console.log(cheese);
  console.log($_data.projects[0].id);
</script>

<style>

</style>

<div class="columns">
  <div class="column">
    <section class="section">
      <div class="container">
        {#each $_data.projects[0].blocks as block, i}
          <Block {...block} />
        {/each}
      </div>
    </section>
  </div>
  <div class="column">
    <section class="section">
      <div class="container">
        <StepHeader />
        {#each $_data.projects[0].blocks[0].steps as step, i}
          <Step {...step} />
        {/each}
      </div>
    </section>
  </div>
</div>
