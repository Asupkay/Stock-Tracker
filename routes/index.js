const pkg_json = require('../package.json')
const turbo = require('turbo360')({site_id:pkg_json.app})
const vertex = require('vertex360')({site_id:pkg_json.app})
const router = vertex.router()
const https = require("https")
const url = require('url')

/*  This is the home route. It renders the index.mustache page from the views directory.
	Data is rendered using the Mustache templating engine. For more
	information, view here: https://mustache.github.io/#demo */
router.get('/', function(req, res){
    if(req.vertexSession.user) {
        res.redirect('/stocks')
    } else {
        let loginmessage = req.query.loginmessage
        let signupmessage = req.query.signupmessage
        res.render('index', {loginmessage: loginmessage, signupmessage: signupmessage})
    }
})

router.get('/stocks', function(req, res) {
    if(req.vertexSession.user) {
        turbo.fetchUser(req.vertexSession.user.id)
        .then(data => {
            getStockInfo(data.stockinput).then(stockdata => {
                let stockprices = []
                for(let i = 0; i < data.stockinput.length; i++) {
                    stockprices.push({name: data.stockinput[i], price: stockdata[i]})
                }
                console.log(stockprices);
                res.render('stocks', {stockinput: stockprices})
            });
        })
    } else {
        res.redirect('/')
    }
})

getStockInfo = (stockinput) => {
    let promises = [];
   
    stockinput.map((item) => {
        let URL = url.parse('https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=' + item + '&apikey=YOUR_API_KEY')
        let promise = getStockPrice(URL)
        promises.push(promise)
    });
        
    return Promise.all(promises).then((values) => {
        return values
    })
}

function getStockPrice(url) {
    let promise = new Promise(
    function(resolve, reject) {
            
        const option = {
            hostname: url.host,
            path: url.path,
        };

        //Call the https get request
        let getRequest = https.get(option, (res) => {
            let fulldata;
            res.on('data', (d) => {
                if(fulldata) {
                    fulldata += d;
                } else {
                    fulldata = d;
                }
            });
            res.on('end', () => {
                let price; 

                //Parse out the JSON data and grab the price from it
                try {
                    let stockJSONData = JSON.parse(fulldata)
                    if(stockJSONData) {
                        price = stockJSONData["Time Series (Daily)"][Object.keys(stockJSONData["Time Series (Daily)"])[0]]['4. close']
                    }   
                } catch (error) {
                    price = "parsing error";
                }
                //resolve the promsie to the price information
                resolve(price);
            });
        });
    });
    return promise;
}

router.post('/stocks', function(req, res) {
    turbo.fetchUser(req.vertexSession.user.id)
    .then(data => {
        let newStocks = data.stockinput
        newStocks.push(req.body.stockinput)
        turbo.updateUser(req.vertexSession.user.id, {stockinput: newStocks})
        .then(data => {
            res.redirect('/stocks');
        })
    })
    
})

router.post('/deletestock', function(req, res) {
    turbo.fetchUser(req.vertexSession.user.id)
    .then(data => {
        let newStocks = data.stockinput
        let index = newStocks.indexOf(req.body.stockdelete)
        if(index > -1) {
            newStocks.splice(index, 1);
        }

        turbo.updateUser(req.vertexSession.user.id, {stockinput: newStocks})
        .then(data => {
            res.redirect('/stocks');
        })
    })
})

router.get('/logout', (req, res) => {
    req.vertexSession.reset()
    res.redirect('/')
})

router.post('/login', function(req, res) {
    turbo.login(req.body)
    .then(data => {
        req.vertexSession.user = {id: data.id}
        res.redirect('/stocks')
    })
    .catch(err => {
        res.redirect('/?loginmessage=' + err.message)
    })
})

router.post('/signup', function(req, res) {
    let user = req.body;
    user.stockinput = [];
    turbo.createUser(user)
    .then(data => {
        req.vertexSession.user = {id: data.id}
        res.redirect('/stocks')
    })
    .catch(err => {
        res.redirect('/?signupmessage' + err.message)
    })
})

module.exports = router
