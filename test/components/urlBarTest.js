/* global describe, it, before, beforeEach */

const Brave = require('../lib/brave')
const {urlInput, urlBarSuggestions, urlbarIcon, activeWebview} = require('../lib/selectors')
const searchProviders = require('../../js/data/searchProviders')
const config = require('../../js/constants/config')

describe('urlBar tests', function () {
  function * setup (client) {
    yield client
      .waitForUrl(Brave.newTabUrl)
      .waitForBrowserWindow()
      .waitForEnabled(urlInput)
  }

  function selectsText (client, text = config.defaultUrl) {
    return client.waitUntil(function () {
      return this.getSelectedText().then(function (value) { return value === text })
    })
  }

  describe('autocomplete', function () {
    Brave.beforeEach(this)

    beforeEach(function * () {
      yield setup(this.app.client)
      yield this.app.client.waitForExist(urlInput)
      yield this.app.client.waitForElementFocus(urlInput)
      yield this.app.client.waitUntil(function () {
        return this.getValue(urlInput).then((val) => val === '')
      })
      yield this.app.client
        .addSite({ location: 'https://brave.com', title: 'Brave' })
        .addSite({ location: 'https://brave.com/test' })
        .addSite({ location: 'https://www.youtube.com' })
    })

    it('autocompletes without protocol', function * () {
      // now type something
      yield this.app.client
        .keys('br')
        .waitUntil(function () {
          return this.getValue(urlInput)
            .then((val) => val === 'brave.com')
        })
    })

    it('autocompletes with protocol', function * () {
      // now type something
      yield this.app.client
        .keys('https://br')
        .waitUntil(function () {
          return this.getValue(urlInput)
            .then((val) => val === 'https://brave.com')
        })
    })

    it('autocompletes without www.', function * () {
      // now type something
      yield this.app.client
        .keys('you')
        .waitUntil(function () {
          return this.getValue(urlInput)
            .then((val) => val === 'youtube.com')
        })
    })

    it('autofills from selected suggestion', function * () {
      // now type something
      yield this.app.client
        .keys('https://br')
        .waitUntil(function () {
          return this.getValue(urlInput)
            .then((val) => val === 'https://brave.com')
        })
        // hit down
        .keys('\uE015')
        .waitUntil(function () {
          return this.getValue(urlInput)
            .then((val) => val === 'https://brave.com/test')
        })
        // hit up
        .keys('\uE013')
        .waitUntil(function () {
          return this.getValue(urlInput)
            .then((val) => val === 'https://brave.com')
        })
    })

    it('autocompletes without losing characters', function * () {
      yield this.app.client
        .keys('a\uE008\uE008b\uE008\uE008o\uE008\uE008u\uE008\uE008t\uE008\uE008x')
        .waitUntil(function () {
          return this.getValue(urlInput)
            .then((val) => val === 'aboutx')
        })
    })

    it('does not show suggestions on focus', function * () {
      yield this.app.client
        .keys('brave')
        .waitUntil(function () {
          return this.isExisting(urlBarSuggestions).then((exists) => exists === true)
        })
        .ipcSend('shortcut-focus-url')
        .waitForElementFocus(urlInput)
        .waitUntil(function () {
          return this.isExisting(urlBarSuggestions).then((exists) => exists === false)
        })
    })
  })

  describe('typing', function () {
    Brave.beforeAll(this)

    before(function * () {
      yield setup(this.app.client)
      yield this.app.client.waitForExist(urlInput)
      yield this.app.client.waitForElementFocus(urlInput)
      yield this.app.client.waitUntil(function () {
        return this.getValue(urlInput).then((val) => val === '')
      })

      yield this.app.client
        .addSite({ location: 'https://brave.com', title: 'Brave' })

      // now type something
      yield this.app.client
        .setValue(urlInput, 'b')
        .waitUntil(function () {
          return this.getValue(urlInput).then((val) => val === 'b')
        })
        .waitForExist(urlBarSuggestions + ' li')
    })

    it('sets the value to "b"', function * () {
      yield this.app.client.waitUntil(function () {
        return this.getValue(urlInput).then((val) => val === 'brave.com')
      })
    })

    it('clears the selected text', function * () {
      // Since now the first letter will trigger the autocomplete
      // expect the selected text to be part of the first suggestion
      // in the list
      yield selectsText(this.app.client, 'rave.com')
    })

    describe('shortcut-focus-url', function () {
      before(function * () {
        yield this.app.client
          .ipcSend('shortcut-focus-url')
      })

      it('has focus', function * () {
        yield this.app.client.waitForElementFocus(urlInput)
      })

      it('selects the text', function * () {
        // Since now the first letter will trigger the autocomplete
        // expect the selected text to be the first suggestion in the list
        yield selectsText(this.app.client, 'brave.com')
      })

      it('has the search icon', function * () {
        yield this.app.client.waitForExist('.urlbarIcon.fa-search')
      })
    })

    describe('type escape once with suggestions', function () {
      before(function * () {
        this.page = Brave.server.url('page1.html')
        return yield this.app.client
          .tabByIndex(0)
          .loadUrl(this.page)
          .windowByUrl(Brave.browserWindowUrl)
          .ipcSend('shortcut-focus-url')
          .waitForElementFocus(urlInput)
          .setValue(urlInput, 'google')
          .waitForExist(urlBarSuggestions + ' li')

          // hit escape
          .keys('\uE00C')
          .waitForElementFocus(urlInput)
      })
      it('does select the urlbar text', function * () {
        yield selectsText(this.app.client, this.page)
      })

      it('does revert the urlbar text', function * () {
        yield this.app.client.getValue(urlInput).should.eventually.be.equal(this.page)
      })
    })

    describe('type escape once with no suggestions', function () {
      before(function * () {
        this.page = Brave.server.url('page1.html')
        return yield this.app.client
          .tabByIndex(0)
          .loadUrl(this.page)
          .windowByUrl(Brave.browserWindowUrl)
          .ipcSend('shortcut-focus-url')
          .waitForElementFocus(urlInput)
          .setValue(urlInput, 'random-uuid-d63ecb78-eec8-4c08-973b-fb39cb5a6f1a')

          // hit escape
          .keys('\uE00C')
          .waitForElementFocus(urlInput)
      })
      it('does select the urlbar text', function * () {
        yield selectsText(this.app.client, this.page)
      })

      it('does revert the urlbar text', function * () {
        yield this.app.client.getValue(urlInput).should.eventually.be.equal(this.page)
      })
    })

    describe('type escape twice', function () {
      before(function * () {
        this.page = Brave.server.url('page1.html')
        return yield this.app.client
          .tabByIndex(0)
          .loadUrl(this.page)
          .windowByUrl(Brave.browserWindowUrl)
          .ipcSend('shortcut-focus-url')
          .waitForElementFocus(urlInput)
          .setValue(urlInput, 'blah')
          // hit escape
          .keys(Brave.keys.ESCAPE)
          .waitForElementFocus(urlInput)
          .keys(Brave.keys.ESCAPE)
      })

      it('selects the urlbar text', function * () {
        yield selectsText(this.app.client, this.page)
      })

      it('sets the urlbar text to the webview src', function * () {
        yield this.app.client.getValue(urlInput).should.eventually.be.equal(this.page)
      })
    })

    describe('submitting by typing a URL', function () {
      before(function * () {
        const url = Brave.server.url('page1.html')
        return yield this.app.client.ipcSend('shortcut-focus-url')
          .setValue(urlInput, url)
          // hit enter
          .keys(Brave.keys.ENTER)
      })

      it('changes the webview src', function * () {
        const url = Brave.server.url('page1.html')
        yield this.app.client.waitUntil(function () {
          return this.getAttribute(activeWebview, 'src').then((src) => src === url)
        })
      })
    })
  })

  describe('search engine go key', function () {
    Brave.beforeAll(this)
    const entries = searchProviders.providers

    before(function * () {
      yield setup(this.app.client)
      yield this.app.client
        .windowByUrl(Brave.browserWindowUrl)
        .waitForExist(urlInput)
        .waitForElementFocus(urlInput)
    })

    beforeEach(function * () {
      yield this.app.client
        .setValue(urlInput, '')
        .waitUntil(function () {
          return this.getValue(urlInput).then((val) => val === '')
        })
    })

    entries.forEach((entry) => {
      describe(entry.name, function () {
        it('has the icon', function * () {
          yield this.app.client
            .keys(entry.shortcut + ' ')
            .waitForExist(urlbarIcon)
            .waitUntil(function () {
              return this
                .getCssProperty(urlbarIcon, 'background-image')
                .then((backgroundImage) => backgroundImage.value === `url("${entry.image}")`)
            })
        })

        it('does not show the default icon (search)', function * () {
          yield this.app.client.waitForExist('.urlbarIcon.fa-search', 1500, true)
        })
      })
    })
  })
})
