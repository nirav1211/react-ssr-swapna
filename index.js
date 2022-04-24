// Webpack dependancy
import "core-js/stable";
import "regenerator-runtime/runtime";

// Node dependancy
import serialize from "serialize-javascript";
import express from "express";
import { promises as fs } from "fs";
const path = require("path");
const cookieParser = require("cookie-parser");

// React dependancy
import React from 'react';
import { Provider } from 'react-redux';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import configureStore from "../src/store";
import { matchPath } from "react-router-dom";
import routes from "../src/routes";
import App from '../src/App';
import { isMobile, isMobileAndTabletCheck } from "../src/utils/ReusableFunctions";
import { updateValuesFromServer } from "../src/app/common/CommonAction";
import { PostLoginInstance, PreLoginInstance } from "../src/utils";
import { Helmet } from "react-helmet";


const port = process.env.PORT || 3000;
const app = express();
app.use(cookieParser());

// other static resources should just be served as they are
app.use('/s', express.static(
  path.resolve(__dirname, '..', 'client_build'),
  { maxAge: '30d' },
));


// This is fired every time the server side receives a request
app.get([
  '/',
  '/track/:trackId',
  '/artist/:artistId',
  '/search-result',
  '/about',
  '/faq',
  '/contact',
  '/terms',
  '/privacy',
  '/refund',
  '/:slug',
], handleRender);

async function handleRender(req, res) {
  try {
    // Check if token exists in cookies
    if (req.cookies && req.cookies.token) {
      PostLoginInstance.defaults.headers['Authorization'] = "Token " + req.cookies.token;
    } else {
      // Check if headers are set when server is running
      // Delete if previous token is present in cookie
      if (PostLoginInstance.defaults.headers["Authorization"])
        delete PostLoginInstance.defaults.headers["Authorization"];
    }

    const store = configureStore();
    // Check device type and store in common reducer, send token from server to client
    store.dispatch(
      updateValuesFromServer(
        isMobile(req.headers['user-agent']),
        (req.cookies && req.cookies.token) ? "Token " + req.cookies.token : null,
        isMobileAndTabletCheck(req.headers['user-agent'])
      )
    );

    const promises = [];
    // use `some` to imitate `<Switch>` behavior of selecting only the first to match
    routes.some(route => {
      const match = matchPath(req.url, route);
      if (match && req.params)
        match['serverParams'] = req.params;
      if (match && route.component && route.component.loadData) {
        promises.push(Promise.resolve(route.component.loadData(match, store.dispatch)));
      }
      return match;
    });

    Promise.all(promises)
      .then(async data => {
        // console.log("data =>>>", data);
        // do something w/ the data so the client can access it then render the app
        // get the html file created with the create-react-app build
        const filePath = path.resolve(__dirname, "..", "client_build", "index.html");
        let indexFile;
        try {
          indexFile = await fs.readFile(filePath, 'utf-8');
        } catch (err) {
          return res.send(`error occured => ${err}`);
        }
        const context = {};

        // Render the component to a string
        const html = renderToString(
          <Provider store={store}>
            <StaticRouter location={req.url} context={context}>
              <App />
            </StaticRouter>
          </Provider>
        )

        const helmet = Helmet.renderStatic();

        if (context.url) {
          res.writeHead(301, {
            Location: context.url
          });
          console.log("Inside redirect");
          return res.end();
        } else {
          // Grab the initial state from our Redux store
          const preloadedState = store.getState();
          // console.log("preloaded state ", preloadedState)
          // now inject the rendered app into our html and send it to the client
          return res.send(
            indexFile
              .replace(/<title>.*<\/title>/, `${helmet.title.toString()}`)
              .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
              .replace('__PRELOADED_STATE__ = {}', `__PRELOADED_STATE__ = ${serialize(preloadedState)}`)
          );
        }
      })
      .catch(err => console.log("ERROR IN PROMISE", err));
  } catch (err) {
    res.send(`error in handle render ${err}`);
  }
}


app.get('*', async (req, res) => {
  try {
    const filePath = path.resolve(__dirname, '..', 'client_build', 'index.html');
    const indexFile = await fs.readFile(filePath, 'utf-8');
    res.send(indexFile);
  } catch (error) {
    res.send(`error found => ${error}`)
  }
})

app.listen(port, '0.0.0.0', () => console.log("running on port " + port));