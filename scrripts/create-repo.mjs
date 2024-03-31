import Fs from 'fs-extra/esm'
import Path from 'path'
import console from 'console'
import assign from 'object-assign'

// node doesn't know how to use HTTPS_PROXY env.... sad
import { fetch as ufetch } from 'undici'
import fetch_enhanced from 'fetch-enhanced'
const fetch = fetch_enhanced(ufetch, {undici: true})

// ----------------------------------------------------

const desktop_path = Path.resolve(Path.join(__dirname, '..'))
const token_path = Path.resolve(Path.join(desktop_path, '..', gh_token))

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

function Desktop (gh, path) {
  if (!gh) throw new Error('desktop needs the github api')
  if (!path) throw new Error('desktop needs to know its path')

  

  return {
    async create (name) {
      if (await gh.repo.create(name))
        console.log(`${name} created on github`)
      else if (await gh.repo.clone(name))
        console.log(`${name} cloned from github`)
      else console.error(`${name} couldn't be created or cloned on github`)

      if (await Fs.ensureDir(Path.join(desktop_path, name)))
        console.log(`${name} desktop path exists`)
    },

    async delete (name, delete_gh) {
      if (delete_gh && false && await gh.repo.delete(name))
        console.log(`${name} deleted from github`)
      console.log(`${name} no delete yet`)
      if (false && await Fs.remove(Path.join(path, name)))
        console.log(`${name} deleted from the desktop`)
    }
  }
}


try {
  gh_token = (await Fs.readFile(token_path, 'utf8')).trim()
} catch (e) {
  console.error(`could not get github access token from '${token_path}'`)
}

try {
  const gh = new GitHub(user, gh_token)
  const desktop = new Desktop(gh, desktop_path)

  await desktop.delete('testing123', true)
  await desktop.create('world-net')
  await desktop.create('24andme')

  console.log('done')

} catch (e) {
  console.error(e)
}
