const dotenv = require('dotenv').config()
const axios = require('axios')
const fs = require('fs')
const express = require('express')
const ejs = require('ejs')

const CRIENT_ID = process.env.CRIENT_ID
const CRIENT_SECRET = process.env.CRIENT_SECRET

const app = express()
const PORT = process.env.PORT || 3000
app.set("view engine", "ejs")
app.use(express.static('public'))

var ACCESS_TOKEN = ''
var REFRESH_TOKEN = ''

app.get('/', async (req, res) => {
    await setTokenVariables()
    const currentPlayer = await getCurrentPlayer()
    const recentlyPlayed = await getRecentlyPlayed()
    const data = {
        isPlaying: currentPlayer.is_playing,
        current: currentPlayer.is_playing === undefined ? {} : {
            track: currentPlayer.item.name,
            artist: currentPlayer.item.artists.map(artist => artist.name).join(', '),
            album: currentPlayer.item.album.name,
            thumbUrl: await getAlbumThumbUrl(currentPlayer.item.album.id),
            url: currentPlayer.context.external_urls.spotify
        },
        recents: await Promise.all(recentlyPlayed.items.map(async item => {
            return {
                track: item.track.name,
                artist: item.track.artists.map(artist => artist.name).join(', '),
                album: item.track.album.name,
                thumbUrl: await getAlbumThumbUrl(item.track.album.id),
                url: item.track.external_urls.spotify
            }
        })),
        dirname: __dirname
    }
    res.render(__dirname + "/index.ejs", data)
})

app.listen(PORT)
console.log(`Server running at ${PORT}`)


async function setTokenVariables() {
    await getFileContent('.accessToken').then(e => ACCESS_TOKEN = e)
    await getFileContent('.refreshToken').then(e => REFRESH_TOKEN = e)
}

async function getFileContent(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) reject(err)
            return resolve(data)
        })
    })
}

async function getCurrentPlayer() {
    return axios({
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`
        }
    }).then(async res => {
        switch (res.status) {
        case 200:
            return res.data
            break
        case 204:
            console.log('no current player')
            return {}
            break
        default:
            console.log('something went wrong')
            return false
            break
        }
    }).catch(async err => {
        if (err.response.status === 401) {
            console.log('access token expired, so retrying...')
            await refreshToken()
            return getCurrentPlayer()
        } else {
            return err.response.data
        }
    })
}

async function getRecentlyPlayed() {
    return axios({
        url: 'https://api.spotify.com/v1/me/player/recently-played',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`
        }
    }).then(async res => {
        switch (res.status) {
        case 200:
            return res.data
            break
        case 204:
            return {}
            break
        default:
            return false
            break
        }
    }).catch(async err => {
        if (err.response.status === 401) {
            console.log('access token expired, so retrying...')
            await refreshToken()
            return getRecentlyPlayed()
        } else {
            return err.response.data
        }
    })
}

async function refreshToken() {
    await axios({
        url: 'https://accounts.spotify.com/api/token',
        method: 'POST',
        params: {
            "grant_type": "refresh_token",
            "refresh_token": REFRESH_TOKEN
        },
        headers: {
            'Accept':'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
            username: CRIENT_ID,
            password: CRIENT_SECRET
        }
    }).then(res => {
        const newAccessToken = res.data.access_token
        console.log('new access token', newAccessToken)
        ACCESS_TOKEN = newAccessToken
        fs.writeFile('.accessToken', newAccessToken, 'utf8', err => {
            if (err) console.log(err)
        })

        const newRefreshToken = res.data.refresh_token
        if (newRefreshToken) {
            console.log('new refresh token', newRefreshToken)
            REFRESH_TOKEN = newRefreshToken
            fs.writeFile('.refreshToken', newRefreshToken, 'utf8', err => {
                if (err) console.log(err)
            })
        }
    })
}

async function getAlbumThumbUrl(albumId) {
    await setTokenVariables()
    return await axios({
        url: `https://api.spotify.com/v1/albums/${albumId}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`
        }
    }).then(res => {
        return res.data.images[2].url
    }).catch(async err => {
        if (err.response.status === 401) {
            console.log('access token expired, so retrying...')
            await refreshToken()
            getAlbumThumbUrl(albumId)
        }
        console.log(err.response)
    })
}
