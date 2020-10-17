const moment = require('moment');

// const time = new Date().getTime()
// const time = Date.now();
// var time = moment.utc().valueOf();

const getTime = () => moment.utc();


const time = getTime();
const min = time.clone().subtract(70, 'minutes');
const max = time.clone().add(70, 'minutes');

const valid = time.isBetween(min, max, 'second');
// const valid = time.isBefore(max);

console.log(valid);