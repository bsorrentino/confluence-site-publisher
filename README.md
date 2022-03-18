
[![npm](https://img.shields.io/npm/v/confluence-site.svg)](https://www.npmjs.com/package/confluence-site)&nbsp;
<img src="https://img.shields.io/github/forks/bsorrentino/confluence-site-publisher.svg">&nbsp;
<img src="https://img.shields.io/github/stars/bsorrentino/confluence-site-publisher.svg">&nbsp;
<a href="https://github.com/bsorrentino/confluence-site-publisher/issues">
<img src="https://img.shields.io/github/issues/bsorrentino/confluence-site-publisher.svg"></a>&nbsp;
![example workflow](https://github.com/bsorrentino/confluence-site-publisher/actions/workflows/npm-publish.yml/badge.svg)
<!--
[![Build Status](https://travis-ci.org/bsorrentino/confluence-site-publisher.svg)](https://travis-ci.org/bsorrentino/confluence-site-publisher)
[![Build Status](https://travis-ci.org/bsorrentino/confluence-site-publisher.svg?branch=master)](https://travis-ci.org/bsorrentino/confluence-site-publisher)
-->

```
 __   __        ___            ___       __   ___     __    ___  ___ 
/  ` /  \ |\ | |__  |    |  | |__  |\ | /  ` |__     /__` |  |  |__  
\__, \__/ | \| |    |___ \__/ |___ | \| \__, |___    .__/ |  |  |___ 
```

## Description 

A CLI (*Command Line Interface*) for publish your site directly to confluence allowing to keep in-sync local and remote documentation

This project should be considered as **[NodeJS](https://nodejs.org/)** version of the [confluence maven plugin](https://github.com/bsorrentino/maven-confluence-plugin) developed using [reactive javascript extension](https://github.com/Reactive-Extensions/RxJS)

The Site is described using a [XML](http://bsorrentino.github.io/maven-confluence-plugin/site_xml_guide.html) or [YAML](http://bsorrentino.github.io/maven-confluence-plugin/site_yaml_guide.html)  **Site descriptor**  that is compatible with the one used by [confluence maven plugin](https://github.com/bsorrentino/maven-confluence-plugin)

### Supported Formats

 format | usage note |
   ---- | ---- |
   **[Confluence wiki](http://bsorrentino.github.io/maven-confluence-plugin/Notation%20Guide%20-%20Confluence.html)**  | use `.wiki` or `.confluence` extension | 
  **Markdown** (throught package [marked](https://www.npmjs.com/package/marked)) | use `.md` extension  |  

### Notes

> From version 2.x both  **rest** and **xmlrpc** protocols are supported 

## Install 

```
npm install confluence-site -g
```

## Usage

```
Usage: confluence-site 

init --serverid <serverid>      // create/update configuration

deploy [--config]               // deploy site to confluence

delete                          // delete site

download --pageid <pageid> [--file] [--wiki] // download page content

info                            // show configuration

Options:

 --serverid     // it is the credentials' profile.
 --config       // force reconfiguration.
 --pageid       // the page identifier.
 --file         // the output file name.
 --wiki         // indicate deprecated wiki content format
```

## Commands

### init 

Initilaize (create/update) the configuration. The configuration is stored into file `./config.json`

 key | description |
---- | ---- |
serverId | It is the credentials' profile. Provided from command line option `--serverid`  |
protocol | `http\|https`. This information is deducted from url|
host | host name or ip address. This information is deducted from url|
port | port number. This information is deducted from url|
path | url path. This information is deducted from url|
spaceId | Confluence target *space identifier* |
parentPageTitle | Confluence container page|
sitePath | Path where the *site descriptor* is located. By default is `./site.xml`|

> Credentials are stored into a separate crypted file (see [preferences](https://www.npmjs.com/package/preferences)) indentified by **serverId** 

### deploy

Deploy pages defined into **site descriptor** directly in confluence 

### delete

Delete pages tree startig from *home* defined into **site descriptor**

### download

download page content 

 param | description | mandatory
---- | ---- | ---- |
pageid | page identifier | yes
file | output file name (default `pageid`) | no
wiki | require the content in old wiki format. Default is **storage format** | no

### info

Show current configuration

> Example
> ```
> site path:		          site.xml
> confluence url:		      http://localhost:8080/
> confluence space id:	  MySpace
> confluence parent page:	Home
> serverid:		            test
> confluence username:	  admin
> confluence password:	  *****
> ```

## Developer usage

For any contributions, you can fork the [source cli dev branch](https://github.com/bsorrentino/maven-confluence-plugin/tree/cli-dev) and create a Pull Request in order to include your improvements.
After cloning in your machine, as a common npm package, you have to run:

```
npm install
```

The development is in the **ts** folder. So to transpile files in watching type:

```
npm start
```

To only build:

```
npm run build
```

The output will be in **dist** folder.

to execute test:
```
npm test
```


To publish on npm registry you have to [create an npm account](https://docs.npmjs.com/getting-started/publishing-npm-packages)

After this, you can execute:

```
npm publish
```


