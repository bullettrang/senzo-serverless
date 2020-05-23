console.log = jest.fn()
const cheerio = require('cheerio')
const when = require('../steps/when')
const { init } = require('../steps/init')
describe(`When we invoke the GET / endpoint`, () => {
  beforeAll(async () => await init())
  it(`Should return the index page with 8 restaurants`, async () => {
    const res = await when.we_invoke_get_index()
    console.log(res)
    expect(res.statusCode).toEqual(200)
    //expect(res.headers['Content-Type']).toEqual('text/html; charset=UTF-8')
    expect(res.headers['content-type']).toEqual('text/html; charset=UTF-8') //axios makes Content-Type lowercase
    expect(res.body).toBeDefined()

    const $ = cheerio.load(res.body)
    const restaurants = $('.restaurant', '#restaurantsUl')
    expect(restaurants.length).toEqual(8)
  })
})