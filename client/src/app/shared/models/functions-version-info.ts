import { Constants, FunctionsGenerations } from './constants';
import { ApplicationSettings } from './arm/application-settings';

export interface FunctionsVersionInfo {
  runtimeStable: string[];
  runtimeDefault: string;
}

export class FunctionsVersionInfoHelper {
  public static needToUpdateRuntime(version: FunctionsVersionInfo, extensionVersion: string) {
    const match = version.runtimeStable.find(v => {
      return extensionVersion.toLowerCase() === v;
    });
    return !match;
  }

  public static getFunctionGeneration(runtimeVersion: string): FunctionsGenerations {
    if (!runtimeVersion) {
      return FunctionsGenerations.v1;
    }

    return runtimeVersion.startsWith('~2') || runtimeVersion.startsWith('2') || runtimeVersion.startsWith('beta')
      ? FunctionsGenerations.v2
      : FunctionsGenerations.v1;
  }

  public static isFunctionGeneration(runtimeVersion: string, functionGeneration: FunctionsGenerations): boolean {
    return FunctionsVersionInfoHelper.getFunctionGeneration(runtimeVersion) === functionGeneration;
  }

  public static extractFunctionVersion(appSettings: ApplicationSettings): string {
    return !appSettings ? null : appSettings[Constants.runtimeVersionAppSettingName];
  }

  public static extractFunctionGeneration(appSettings: ApplicationSettings): FunctionsGenerations {
    const version = FunctionsVersionInfoHelper.extractFunctionVersion(appSettings);
    return FunctionsVersionInfoHelper.getFunctionGeneration(version);
  }

  public static hasFunctionGenerationSet(appSettings: ApplicationSettings, functionGeneration: FunctionsGenerations): boolean {
    const generation = FunctionsVersionInfoHelper.extractFunctionGeneration(appSettings);
    return generation === functionGeneration;
  }

  public static getEventGridUri(generation: FunctionsGenerations, mainSiteUrl: string, functionName: string, code: string) {
    const path = generation === FunctionsGenerations.v1 ? 'admin/extensions/EventGridExtensionConfig' : 'runtime/webhooks/EventGrid';

    return `${mainSiteUrl.toLowerCase()}/${path}?functionName=${functionName}&code=${code}`;
  }

  public static extractFunctionWorkerLanguaage(appSettings: ApplicationSettings): string {
    return !appSettings ? null : appSettings[Constants.functionsWorkerRuntimeAppSettingsName];
  }

  public static hasFunctionWorkerLanguaageSet(appSettings: ApplicationSettings, workerLanguage: string): boolean {
    const language = FunctionsVersionInfoHelper.extractFunctionWorkerLanguaage(appSettings);
    return language === (workerLanguage || '').toLowerCase();
  }
}
