const DIR = '/Users/vietdht/Downloads/Books'

let prompt = require('prompt');
prompt.start();
prompt.get([{
    name: 'select',
    description:
        'Book Downloader - Created by VietDHT\n        1. Update cookie\n        2. Download\n        Selection',
    required: true
}], function (err, result) {
    if (result.select === '1') {
        login()
    } else if (result.select === '2') {
        prompt.get([{
            name: 'book',
            description: 'Book',
            required: true
        },
            {
                name: 'directory',
                description: 'Save to',
                required: true
            }], function (err, result) {
            let fs = require('fs');
            let config = JSON.parse(fs.readFileSync('config.json'))
            let option = {
                directory: result.directory || DIR,
                cookie: config.cookie,
            }
            download(result.book, 1, option);
        });
    }
})

function download(id, index, option = {}) {
    let fs = require('fs')
    let cmd = require('node-command-line')
    let https = require('https')
    let mkdirp = require('mkdirp')
    let url = require('url')
    let file = `https://saplearninghub.plateau.com/icontent_e/CUSTOM_eu/sap/self-managed/ebook/${id}/xml/topic${index}.svg`
    let httpOption = {
        hostname: url.parse(file).hostname,
        port: '443',
        path: url.parse(file).pathname,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11',
            'Accept': '*/*',
            'Cookie': `AKAMAI_AUTH_COOKIE=${option.cookie}`
        }
    }

    if (index === 1) {
        // Prepare common file
        fs.writeFile(`${option.directory}/style.css`, `@page { size: A4; margin: 0px; padding: 0px; }`, 'utf8', function () {
        })
        fs.writeFile(`${option.directory}/${id}.html`, `<html><body>`, 'utf8', function () {
        })
    }

    let path = `${option.directory}/topic${index}.svg`
    let request = https.get(httpOption, function (response) {
        if (response.statusCode === 200) {
            mkdirp(option.directory, function (err) {
                if (err) throw err
                var file = fs.createWriteStream(path);
                response.pipe(file) // Save svg file
                fs.appendFile(`${option.directory}/${id}.html`, `<object data="topic${index}.svg" type="image/svg+xml"></object>`, 'utf8', function () {
                })
                process.stdout.write("Downloading..." + index + "\r");
                download(id, ++index, option)
            })
        } else if (response.statusCode === 404) {
            console.log(`Finish! Total page: ${index - 1}`)
            console.log(`Start building PDF`)
            fs.appendFile(`${option.directory}/${id}.html`, `</body></html>`, 'utf8', function () {
            })
            cmd.run(`prince -s ${option.directory}/style.css ${option.directory}/${id}.html`)
        } else if (response.statusCode === 302) {
            console.log(`Please update cookie by Option 1`)
        } else {
            console.log(`HTTP Error! Status code: ${response.statusCode}`)
        }
        request.setTimeout(20000, function () {
            request.abort()
            console.log('Time out!')

        })
    }).on('error', function (e) {
        console.log('Request Error!')
    })
}

function login() {
    const LOGIN_LINK = "https://performancemanager.successfactors.eu/sf/learning?Treat-As=WEB&bplte_company=learninghub&_s.crb=EttEXYlbRg7NM9gE%2bsngyhSFmRw%3ds4c40";

    console.log('Just wait...Chrome will get cookie and close by itself')
    let fs = require('fs');
    let webdriver = require('selenium-webdriver'),
        By = webdriver.By,
        until = webdriver.until;
    let chromeCapabilities = webdriver.Capabilities.chrome().set('chromeOptions', {
        'args': ['--incognito']
    });
    let driver = new webdriver.Builder()
        .forBrowser('chrome')
        .withCapabilities(chromeCapabilities)
        .build();

    let config = JSON.parse(fs.readFileSync('config.JSON'));
    driver.get(LOGIN_LINK);
    driver.findElement(By.xpath("//input[@name='idpName' and @value='Click continue to proceed to the SAP Learning Platform']")).click();
    driver.findElement(By.id('subBtn')).click();
    driver.findElement(By.name('j_username')).sendKeys(config.username);
    driver.findElement(By.name('j_password')).sendKeys(config.password);
    driver.findElement(By.id('logOnFormSubmit')).click();
    driver.wait(until.elementLocated(By.name('iframelearning')));
    driver.switchTo().frame(driver.findElement(By.name('iframelearning')));
    driver.wait(until.elementLocated(By.name('keywords')));
    driver.navigate().to('https://saplearninghub.plateau.com/learning/user/onlineaccess/icontent.do?Course=CUSTOM_eu&url=/self-managed/ebook/GW100_EN_Col15_R1.1/index.html');
    driver.wait(until.elementLocated(By.id('searchField')));
    driver.manage().getCookies().then(function (cookies) {
        for (let cookie of cookies) {
            if (cookie.name === 'AKAMAI_AUTH_COOKIE') {
                config.cookie = cookie.value;
                fs.writeFile('config.json', JSON.stringify(config), 'utf8', function () {
                    console.log('Cookie updated!')
                });
            }
        }
    });
    driver.quit()
}

