const moment = require('moment');

// const time = new Date().getTime()
// const time = Date.now();
// var time = moment.utc().valueOf();

const get_time = () => moment.utc();



// const valid = time.isBefore(max);

const is_valid = other => {
  const time = get_time();
  const min = time.clone().subtract(70, 'minutes');
  const max = time.clone().add(70, 'minutes');
  
  return time.isBetween(min, max, 'second');
}

let node_times = [

]

const got_time = time => {
  if (is_valid(time)) {
    const diff = time.diff(get_time())
    node_times.push(diff)

    console.log('added time', diff)
  } else {
    console.log('invalid time')
  }
}

const network_time = () => {
  node_times.sort()

  const middle = Math.floor(node_times.length / 2)
  const median = node_times[middle]

  return get_time().add(median);
}

got_time(get_time().add(10, 'minutes'))
got_time(get_time().add(1, 'minutes'))
got_time(get_time().subtract(1, 'minutes'))
got_time(get_time().subtract(2, 'minutes'))
got_time(get_time().subtract(5, 'minutes'))
got_time(get_time().subtract(2, 'minutes'))
got_time(get_time().subtract(2, 'minutes'))

console.log(network_time())