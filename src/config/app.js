const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('../routes');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use('/', routes);

module.exports = app;
