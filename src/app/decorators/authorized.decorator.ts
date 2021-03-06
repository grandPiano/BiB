// Helpers
import { Bib } from 'app/helpers';
import {
  IAppState, IUserGroup, IUserSettings,
  ISession, IConfig, IWindowEx,
  ICountry, ILocalData, IAcl
} from 'app/interfaces';
import { ActionType } from 'app/enums';
import { bibApi } from 'app/apis';
import * as fetchApi from 'app/apis/fetch';
import * as _ from 'lodash';
const json = require('circular-json');
const config: IConfig = require('../../config.json');

const getAcls = (): Promise<IAcl[]> => {
  return bibApi.getAcls().then(acls => {
    return acls;
  });
};

const getGroups = (): Promise<IUserGroup[]> => {
  return bibApi.getUserGroups().then(groups => {
    return groups;
  });
};

const getLocalData = (): ILocalData => {
  return JSON.parse(localStorage.getItem(config.bib_localstorage));
};

const getAcl = (acls: IAcl[], data: ILocalData): IAcl => {
  return _.find(acls, acl => {
    return _.eq(_.toString(acl.ID), _.toString(data.userAclID));
  });
};

const getUserID = (data: ILocalData): number => {
  if (data && data.userID) {
    return data.userID;
  }
  return undefined;
};

const getGroup = (groups: IUserGroup[], data: ILocalData): IUserGroup => {
  return _.find(groups, gr => {
    return _.eq(_.toString(gr.ID), _.toString(data.groupID));
  });
};

const getLangCode = (data: ILocalData): string => {
  if (data && data.language) {
    return data.language;
  }
  return 'en-US';
};

const getLanguageFile = (code: string): Promise<{ [key: string]: string; }> => {
  return fetchApi.doFetch(`${bibApi.translationsUrl}/${code}`).then((translation: { [key: string]: string }) => {
    return translation;
  });
};

const showWarning = (message: string, caption: string) => {
  toastr.options.timeOut = 2000;
  toastr.options.progressBar = false;
  toastr.options.positionClass = 'toast-top-center';
  toastr.error(message, caption);
};

// a very simple method to check for permission
const isAdminUser = (group: IUserGroup, userAcl: IAcl = undefined): boolean => {
  return (group.Name === 'Administrators');
};

const canExecuteAction = (group: IUserGroup, userAcl: IAcl, action: ActionType): boolean => {
    switch (action) {
      case ActionType.AddMedium:
        return userAcl.CanAddMedia;
      case ActionType.AddReader:
        return userAcl.CanAddReaders;
      case ActionType.AddUser:
        return userAcl.CanAddUsers;
      case ActionType.BorrowMedium:
        return true;
      case ActionType.ManageUser:
        return userAcl.CanModifyUsers;
      case ActionType.ModifyMedium:
        return userAcl.CanModifyMedia;
      case ActionType.ModifyReader:
        return userAcl.CanModifyReaders;
      case ActionType.ModifyUser:
        return userAcl.CanModifyUsers;
      case ActionType.RemoveMedium:
        return userAcl.CanRemoveMedia;
      case ActionType.RemoveReader:
        return userAcl.CanRemoveReaders;
      case ActionType.RemoveUser:
        return userAcl.CanRemoveUsers;
      case ActionType.UnborrowMedium:
        return true;
      default:
        return false;
    }
};

/**
 * authorized decorator
 * It returns a function that executes the decorated method
 */
export function authorized() {
  let acls: IAcl[] = [];
  let groups: IUserGroup[] = [];
  getAcls().then((_acls: IAcl[]) => acls = _acls);
  getGroups().then((_groups: IUserGroup[]) => groups = _groups);

  return (target: any, fn: string, descriptor: any) => {
    let langFiles = {};
    let langFile = undefined;
    // get all available languages for later displaying of messages
    // in user's preferred language
    const all = _.map(config.countries, country => {
      return getLanguageFile(country.language).then(file => {
        return {
          code: country.language,
          file: file
        };
      });
    });
    Promise.all(all).then(results => langFiles = results);
    // save a reference to the original method
    // this way we keep the values currently in the
    // descriptor and don't overwrite what another
    // decorator might have done to the descriptor.
    const originalMethod = descriptor.value;
    // editing the descriptor/value parameter
    descriptor.value = function (...args: any[]) {
      if (_.isNil(this) || _.isNil(this.action)) {
        return originalMethod.apply(this, args);
      }
      let action = !_.isNil(this.action) ? this.action : this.dynamicComponent.inputs['action'];
      let result = undefined;
      const data = getLocalData();
      const code = getLangCode(data);
      const group = getGroup(groups, data); // session.User;
      const acl = getAcl(acls, data);

      langFile = _.find(langFiles, { code: code })['file'];
      if (isAdminUser(group, acl)) {
        // call function if access is granted
        result = originalMethod.apply(this, args);
      } else {
        if (canExecuteAction(group, group.Acl, action)) {
          result = originalMethod.apply(this, args);
        } else {
          showWarning(langFile['WarnInsufficientRights'], langFile['Error']);
        }
      }
      console.log(`Calling: ${fn}(${args}) => ${json.stringify(result)}`);
      return result;
    };
    // return edited descriptor
    return descriptor;
  };

}
