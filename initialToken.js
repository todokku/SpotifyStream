const axios = require('axios')
const dotenv = require('dotenv').config()
const fs = require('fs')

const AUTH_CODE = process.env.AUTH_CODE
const CRIENT_ID = process.env.CRIENT_ID
const CRIENT_SECRET = process.env.CRIENT_SECRET

function getInitialAccessToken() {
    axios({
        url: 'https://accounts.spotify.com/api/token',
        method: 'post',
        params: {
            grant_type: "authorization_code",
            code: AUTH_CODE,
            redirect_uri: "http://localhost:8888"
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
        console.log(res)
        console.log('access token', res.data.access_token)
        console.log('refresh token', res.data.refresh_token)
    }).catch(err => {
        console.log(err)
    })
}
getInitialAccessToken()
