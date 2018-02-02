const pkg_json = require('./package.json')
const vertex = require('vertex360')({site_id:pkg_json.app})

// initialize app
const app = vertex.app()

// import routes
const index = require('./routes/index')
const api = require('./routes/api')

// set routes
app.use('/', index)
app.use('/api', api) // sample API Routes


module.exports = app