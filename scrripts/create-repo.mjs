import Fs from 'fs-extra'
import Path from 'path'
import console from 'console'
import assign from 'object-assign'
// import chokidar from 'chokidar'
// import { File, Dir } from 'fs-pro'
import Git from 'simple-git'

// node doesn't know how to use HTTPS_PROXY env.... sad
import { fetch as ufetch } from 'undici'
import fetch_enhanced from 'fetch-enhanced'
const fetch = fetch_enhanced(ufetch, {undici: true})

// ----------------------------------------------------

const desktop_path = Path.resolve(Path.join(import.meta.dirname, '..'))
const token_path = Path.resolve(Path.join(desktop_path, '..', 'gh_token'))

let gh_token
let user = 'heavyk'

function GitHub (user, auth) {
  function do_fetch (method, url, opts) {
    return fetch(url, {
      method,
      verbose: true,
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
        return res.status === 201 ? (await res.json()) : false
      },

      async delete (name) {
        let res = await do_fetch('DELETE', `https://api.github.com/repos/${user}/${name}`)
        return res.status === 204
      },

      async clone (name) {

      },
    }
  }
}

function Desktop (gh, path) {
  if (!gh) throw new Error('desktop needs the github api')
  if (!path) throw new Error('desktop needs to know its path')

  let repos = []
  let desktop = Git(desktop_path)


  // let watcher = chokidar.watch(path, { depth: 1 })
  // watcher.on('addDir', path => {
  //   console.log('desktop dir', path)
  // })

  return {
    async add (name) {
      console.log('no op')
    },

    async create (name) {
      let gh_create = await gh.repo.create(name)
      if (gh_create)
        console.log(`${name} created on github: ${gh_create.html_url}`)
      else if (await gh.repo.clone(name))
        console.log(`${name} cloned from github`)
      else console.error(`${name} couldn't be created or cloned on github`)

      const repo_path = Path.join(desktop_path, name)
      const user_reop = `${user}/${name}`
      const repo_url = `https://github.com/${user_reop}`
      const remote_url = `https://${user}:${gh_token}@github.com/${user_reop}`

      await Fs.ensureDir(repo_path)
      if (await Fs.exists(repo_path)) {
        let repo = Git(repo_path)
        await repo.init()

        // const readme_path = Path.join(repo_path, "README.md")
        // if (!(await Fs.exists(readme_path))) {
        //   await Fs.writeFile(readme_path, `# ${name}\n`)
        //   await repo.add('.')
        //   await repo.commit('initial commit')
        // }

        await repo.branch(['-M', 'main'])

        if (gh_create) {
          let remotes = await repo.getRemotes(true)
          if (remotes.filter(r => r.name === 'github').length) {
            if (await repo.remote(['set-url', 'github', remote_url]))
              console.log(`${name}: set github remote`)
          } else {
            if (await repo.addRemote('github', remote_url))
              console.log(`${name}: added github remote`)
          }
        }

        if (await repo.push('github', 'main', ['-u']))
          console.log(`${name}: pushed successfully`)

        let sm = await desktop.subModule()
        let r1 = await desktop.submoduleAdd(repo_url, repo_path)
        let r2 = await desktop.commit(`add ${name}`)
        console.log(`added ${name} to desktop`)
      }
    },

    async delete (name, delete_gh) {
      if (delete_gh && await gh.repo.delete(name))
        console.log(`${name} deleted from github`)

      // if (await Fs.remove(Path.join(path, name)))
      //   console.log(`${name} deleted from the desktop`)
    }
  }
}


try {
  gh_token = (await Fs.readFile(token_path, 'utf8')).trim()
} catch (_e) {
  console.error(`could not get github access token from '${token_path}'`, _e)
}

try {
  const gh = new GitHub('heavyk', gh_token)
  const desktop = new Desktop(gh, desktop_path)

  // await desktop.delete('testing123', true)
  // await desktop.create('testing123')

  // await desktop.create('world-net')
  // await desktop.create('24andme')

  // await desktop.delete('pure-desire', true)
  await desktop.create('pure-desire')

  console.log('done')

} catch (e) {
  console.error(e)
}
