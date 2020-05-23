const { promisify } = require('util')
const mode = process.env.TEST_MODE  //to toggle between invoking lambda locally (integration tests) & hitting API GW endpoint (acceptance tests)
const aws4 = require('aws4') //for /restaurants
const URL = require('url')
const http = require('axios') //to make a general HTTP request
const APP_ROOT = '../../'
const _ = require('lodash')

const viaHandler = async (event, functionName) => {
  const handler = promisify(require(`${APP_ROOT}/functions/${functionName}`).handler)

  const context = {}
  const response = await handler(event, context)
  console.log(response);
  //const contentType = _.get(response, 'headers.Content-Type', 'application/json');
  const contentType = _.get(response, 'headers.content-type', 'application/json');
  if (response.body && contentType === 'application/json') {
    response.body = JSON.parse(response.body);
  }
  return response
}

const respondFrom = async (httpRes) => ({
    statusCode: httpRes.status,
    body: httpRes.data,
    headers: httpRes.headers
  })
  
  /**
   * This function signs our requests
   * @param {*} url - url to call
   */
  const signHttpRequest = (url) => {
    const urlData = URL.parse(url)
    const opts = {
      host: urlData.hostname,
      path: urlData.pathname
    }
  
    aws4.sign(opts)
    return opts.headers
  }
  
  const viaHttp = async (relPath, method, opts) => {
    const url = `${process.env.rootUrl}/${relPath}`     //make a request to the rootUrl variable (configured in serverless.yml)
    console.info(`invoking via HTTP ${method} ${url}`)
  
    try {
      const data = _.get(opts, "body")
      let headers = {}
      if (_.get(opts, "iam_auth", false) === true) {
        headers = signHttpRequest(url)
      }
  
      const authHeader = _.get(opts, "auth")
      if (authHeader) {
        headers.Authorization = authHeader
      }
  
      const httpReq = http.request({
        method, url, headers, data
      })
  
      const res = await httpReq
      return respondFrom(res)
    } catch (err) {
      if (err.status) {
        return {
          statusCode: err.status,
          headers: err.response.headers
        }
      } else {
        throw err
      }
    }
  }

const we_invoke_get_index = async () => {
    switch (mode) {
      case 'handler':
        return await viaHandler({}, 'get-index')
      case 'http':
        return await viaHttp('', 'GET',{iam_auth:true}) // '' is a relative path , in this case to our home page and GET is the HTTP method
      default:
        throw new Error(`unsupported mode: ${mode}`)
    }
  }
const we_invoke_get_restaurants = () => viaHandler({}, 'get-restaurants')
const we_invoke_search_restaurants = async (theme, user) => {
    const body = JSON.stringify({ theme })
  
    switch (mode) {
      case 'handler':
        return await viaHandler({ body }, 'search-restaurants')
      case 'http':
        const auth = user.idToken
        return await viaHttp('restaurants/search', 'POST', { body, auth })
      default:
        throw new Error(`unsupported mode: ${mode}`)
    }
  }

module.exports = {
  we_invoke_get_index,
  we_invoke_get_restaurants,
  we_invoke_search_restaurants
}