<script>
  import moment from "moment";

  let pomodoroLengthInSeconds = 1500
  let timer;
  let state = "Start";
  let newTimer = moment.duration("25:00");

  $: duration = pomodoroLengthInSeconds; //25 minutes
  $: formattedTime = moment.utc(duration * 1000).format("mm:ss");

  function toggleTimer() {
    if (state == "Start") {
      timer = setInterval(() => {
        duration--;
      }, 1000);
    }
    toggleState();
  }

  function toggleState() {
    if (state === "Pause") {
      clearInterval(timer);
    }
    state = (state === "Start") ? "Pause" : "Start";
  }

    function resetTimer () {
        duration = 1500
        clearInterval(timer)
    }


</script>

<style>
.timer {
    font-size: 2rem;
}

 .is-primary {
     width: 80px;
 }

</style>

<p class="timer">{formattedTime}</p>
<button on:click={toggleTimer} class="button is-primary">{state}</button>
<button on:click={resetTimer} class="button is-warning">Reset</button>

