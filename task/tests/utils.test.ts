import { expect } from 'chai';
import * as utils from '../src/utils';
import * as tl from 'azure-pipelines-task-lib';
import * as semver from 'semver';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as sinon from 'sinon';

const tempDirectory = path.join(__dirname, 'temp');
const toolsDirectory = path.join(__dirname, 'tools');
const inputStub = sinon.stub(tl, 'getInput');

describe('helmfile util', () => {
  before(function() {
    if (!fs.existsSync(tempDirectory)) {
      fs.mkdirSync(tempDirectory);
    }

    if (!fs.existsSync(toolsDirectory)) {
      fs.mkdirSync(toolsDirectory);
    }

    tl.setVariable('agent.TempDirectory', tempDirectory);
    tl.setVariable('agent.ToolsDirectory', toolsDirectory);
  });
  after(function() {
    rimraf(tempDirectory, (_: any) => {
      return;
    });
    rimraf(toolsDirectory, (_: any) => {
      return;
    });
  });
  describe('#getHelmfileVersion()', () => {
    it('should be able return semver when passing latest', async () => {
      inputStub.withArgs('helmfileVersionToInstall').returns('latest');
      const version = await utils.getHelmfileVersion();
      expect(version).to.not.be.empty;
      expect(semver.major(version)).to.be.an('number');
      expect(semver.minor(version)).to.be.an('number');
      expect(semver.patch(version)).to.be.an('number');
    });
    it('should be able return semver when passing vx.x.x', async () => {
      inputStub.withArgs('helmfileVersionToInstall').returns('v0.145.2');
      const version = await utils.getHelmfileVersion();
      expect(version).to.not.be.empty;
      expect(semver.major(version)).to.be.an('number');
      expect(semver.minor(version)).to.be.an('number');
      expect(semver.patch(version)).to.be.an('number');
    });
  });
  describe('#getHelmfile()', () => {
    it('should be able resolve executable', async () => {
      const executable = await utils.getHelmfile();
      expect(executable).to.not.be.empty;
      expect(fs.existsSync(executable)).true;
    });
  });
  describe('#downloadHelmfile()', () => {
    it('should be able to download latest stable version', async () => {
      const executable = await utils.downloadHelmfile();
      expect(executable).to.not.be.empty;
      expect(fs.existsSync(executable)).true;
    });
    it('should be able to download specific version', async () => {
      const executable = await utils.downloadHelmfile('v0.145.0');
      expect(executable).to.not.be.empty;
      expect(fs.existsSync(executable)).true;
    });
  });
});
