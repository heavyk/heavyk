import fs from 'fs/promises'
import path from 'path'
import console from 'console'
import assign from 'object-assign'

// node doesn't know how to use HTTPS_PROXY env.... sad
import { fetch as ufetch } from 'undici'
import fetch_enhanced from 'fetch-enhanced'
const fetch = fetch_enhanced(ufetch, {undici: true})

// ----------------------------------------------------

const token_path = path.resolve('../gh_token')

let gh_token
let repo_name = 'testing123'
let user = 'heavyk'

function GitHub (user, auth) {
  function do_fetch (method, url, opts) {
    return fetch(url, {
      method,
      body: JSON.stringify(opts),
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer "+auth,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    })
  }

  return {
    repo: {
      async create (name, options) {
        options = assign({name, private: false}, options)
        let res = await do_fetch('POST', 'https://api.github.com/user/repos', options)
        return  res.status == 201 ? (await res.json()) : false
      },

      async delete (name) {
        let res = await do_fetch('DELETE', `https://api.github.com/repos/${user}/${name}`)
        return res.status == 204 ? true : false
      }
    }
  }
}


try {
  gh_token = (await fs.readFile(token_path, 'utf8')).trim()
} catch (e) {
  console.error(`could not get github access token from '${token_path}'`)
}

try {
  const gh = new GitHub(user, gh_token)
  if (await gh.repo.delete('testing123'))
    console.log('deleted successfully')
  if (await gh.repo.create('testing123'))
    console.log('created successfully')

  console.log('done')

} catch (e) {
  console.error(e)
}
