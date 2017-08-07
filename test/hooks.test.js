const expect = require('expect');
const rimraf = require('rimraf');

const Nautilus = require('../index');
let nautilus = new Nautilus();

const makeHook = require('./util/make-hook');

describe('core:hooks', function() {

  let hookLoaded = false;

  before(done => {
    makeHook(__dirname + '/lib/hooks/custom', `
      return {
        called: false,
        foo: () => app.custom.called = true,
      }
    `, done);
  });

  before(done => {
    makeHook(__dirname + '/lib/hooks/badHook', `
      throw new Error('I am a bad hook!');
    `, done);
  });

  before(done => {
    makeHook(__dirname + '/lib/hooks/service/index', `
      app.custom.foo();
    `, done);
  });

  before(done => {
    makeHook(__dirname + '/lib/hooks/service/private', `
      throw new Error('I am private, do not use me!');
    `, done);
  });

  before(done => {
    makeHook(__dirname + '/lib/hooks/xylophone', `
      return {
        play: () => true,
      }
    `, done, -1);
  });

  it('prevents errors if hooks do not exist', () => {
    nautilus.app.hooks.load('custom');
  });

  it('allows hooks to be disabled with configuration', () => {
    nautilus.app.config.badHook = false;
    nautilus.app.hooks.after('core:custom', () => hookLoaded = true);
    nautilus.app.hooks.load('core');
    expect(nautilus.app.hooks.loaded).toInclude('core:custom');
  });

  it('builds on the app object for hooks that return an object', () => {
    expect(nautilus.app.custom.foo).toExist();
    expect(typeof nautilus.app.custom.foo).toEqual('function');
  });

  it('loads nested hooks if they match the [hook]/index.js pattern', () => {
    expect(nautilus.app.custom.called).toEqual(true);
  });

  it('respects the defined order of hooks', () => {
    expect(nautilus.app.hooks.core.shift()).toEqual('xylophone');
  });

  it('emits an event as each hook is loaded', () => {
    expect(hookLoaded).toEqual(true);
  });

  it('allows hook loaded subscriptions even after the hook has loaded', () => {
    let afterLoaded = false;
    nautilus.app.hooks.after('core:custom', () => afterLoaded = true);
    expect(afterLoaded).toEqual(true);
  });

  it('cleans up empty hooks', () => {
    expect(nautilus.app.service).toNotExist();
  });

  before(done => {
    makeHook('test/hooks/more', `
      return {
        foo: () => 'bar',
      }
    `, done);
  });

  it('allows loading hooks at any location', () => {
    nautilus.app.hooks.load('custom', 'test/hooks');
    expect(nautilus.app.more.foo).toExist();
  });

  after(done => rimraf('test/lib', done));
  after(done => rimraf('test/hooks', done));

});
