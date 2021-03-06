import { Links } from 'app/shared/models/constants';
import { PriceSpec, PriceSpecInput } from './price-spec';
import { FreePlanPriceSpec } from './free-plan-price-spec';
import { SharedPlanPriceSpec } from './shared-plan-price-spec';
import { BasicSmallPlanPriceSpec, BasicMediumPlanPriceSpec, BasicLargePlanPriceSpec } from './basic-plan-price-spec';
import { StandardSmallPlanPriceSpec, StandardMediumPlanPriceSpec, StandardLargePlanPriceSpec } from './standard-plan-price-spec';
import { PremiumV2SmallPlanPriceSpec, PremiumV2MediumPlanPriceSpec, PremiumV2LargePlanPriceSpec } from './premiumv2-plan-price-spec';
import { PremiumSmallPlanPriceSpec, PremiumMediumPlanPriceSpec, PremiumLargePlanPriceSpec } from './premium-plan-price-spec';
import { IsolatedSmallPlanPriceSpec, IsolatedMediumPlanPriceSpec, IsolatedLargePlanPriceSpec } from './isolated-plan-price-spec';
import {
  PremiumContainerSmallPriceSpec,
  PremiumContainerMediumPriceSpec,
  PremiumContainerLargePriceSpec,
} from './premium-container-plan-price-spec';
import {
  ElasticPremiumSmallPlanPriceSpec,
  ElasticPremiumMediumPlanPriceSpec,
  ElasticPremiumLargePlanPriceSpec,
} from './elastic-premium-plan-price-spec';
import { Injector } from '@angular/core';
import { PortalResources } from '../../../shared/models/portal-resources';
import { TranslateService } from '@ngx-translate/core';
import { ArmUtil } from '../../../shared/Utilities/arm-utils';
import { PlanPriceSpecManager } from './plan-price-spec-manager';

export enum BannerMessageLevel {
  ERROR = 'error',
  SUCCESS = 'success',
  WARNING = 'warning',
  INFO = 'info',
  UPSELL = 'upsell',
}

export interface BannerMessage {
  message: string;
  level: BannerMessageLevel;
  infoLink?: string;
  infoActionIcon?: string;
  infoActionFn?: () => void;
  dismissable?: boolean;
}

export enum PriceSpecGroupType {
  DEV_TEST = 'devtest',
  PROD = 'prod',
  ISOLATED = 'isolated',
}

export abstract class PriceSpecGroup {
  abstract iconUrl: string;
  abstract recommendedSpecs: PriceSpec[];
  abstract additionalSpecs: PriceSpec[];
  abstract title: string;
  abstract id: PriceSpecGroupType;
  abstract description: string;
  abstract emptyMessage: string;
  abstract emptyInfoLink: string;

  bannerMessage: BannerMessage;
  selectedSpec: PriceSpec = null;
  isExpanded = false;

  protected ts: TranslateService;

  constructor(protected injector: Injector, protected specManager: PlanPriceSpecManager) {
    this.ts = injector.get(TranslateService);
  }

  abstract initialize(input: PriceSpecInput);
}

export class DevSpecGroup extends PriceSpecGroup {
  recommendedSpecs = [
    new FreePlanPriceSpec(this.injector),
    new SharedPlanPriceSpec(this.injector),
    new BasicSmallPlanPriceSpec(this.injector),
  ];

  additionalSpecs = [new BasicMediumPlanPriceSpec(this.injector), new BasicLargePlanPriceSpec(this.injector)];

  selectedSpec = null;
  iconUrl = 'image/tools.svg';
  title = this.ts.instant(PortalResources.pricing_devTestTitle);
  id = PriceSpecGroupType.DEV_TEST;
  description = this.ts.instant(PortalResources.pricing_devTestDesc);
  emptyMessage = this.ts.instant(PortalResources.pricing_emptyDevTestGroup);
  emptyInfoLink = Links.appServicePricing;

  constructor(injector: Injector, specManager: PlanPriceSpecManager) {
    super(injector, specManager);
  }

  initialize(input: PriceSpecInput) {
    if (input.specPickerInput.data) {
      if (input.specPickerInput.data.isLinux) {
        this.bannerMessage = {
          message: this.ts.instant(PortalResources.pricing_linuxTrial),
          level: BannerMessageLevel.INFO,
        };
      } else if (input.specPickerInput.data.isXenon) {
        this.bannerMessage = {
          message: this.ts.instant(PortalResources.pricing_windowsContainers),
          level: BannerMessageLevel.INFO,
          infoLink: 'https://go.microsoft.com/fwlink/?linkid=2009013',
        };
      }
    }
  }
}

export class ProdSpecGroup extends PriceSpecGroup {
  recommendedSpecs = [
    new PremiumV2SmallPlanPriceSpec(this.injector, this.specManager),
    new PremiumV2MediumPlanPriceSpec(this.injector, this.specManager),
    new PremiumV2LargePlanPriceSpec(this.injector, this.specManager),
    new PremiumContainerSmallPriceSpec(this.injector),
    new PremiumContainerMediumPriceSpec(this.injector),
    new PremiumContainerLargePriceSpec(this.injector),
    new ElasticPremiumSmallPlanPriceSpec(this.injector),
    new ElasticPremiumMediumPlanPriceSpec(this.injector),
    new ElasticPremiumLargePlanPriceSpec(this.injector),
  ];

  additionalSpecs = [
    new StandardMediumPlanPriceSpec(this.injector),
    new StandardLargePlanPriceSpec(this.injector),
    new PremiumSmallPlanPriceSpec(this.injector),
    new PremiumMediumPlanPriceSpec(this.injector),
    new PremiumLargePlanPriceSpec(this.injector),
  ];

  selectedSpec = null;
  iconUrl = 'image/app-service-plan.svg';
  title = this.ts.instant(PortalResources.pricing_productionTitle);
  id = PriceSpecGroupType.PROD;
  description = this.ts.instant(PortalResources.pricing_productionDesc);
  emptyMessage = this.ts.instant(PortalResources.pricing_emptyProdGroup);
  emptyInfoLink = Links.appServicePricing;

  constructor(injector: Injector, specManager: PlanPriceSpecManager) {
    super(injector, specManager);
  }

  initialize(input: PriceSpecInput) {
    if (input.specPickerInput.data) {
      if (input.specPickerInput.data.isLinux) {
        this.bannerMessage = {
          message: this.ts.instant(PortalResources.pricing_linuxTrial),
          level: BannerMessageLevel.INFO,
        };
      } else if (input.specPickerInput.data.isXenon) {
        this.bannerMessage = {
          message: this.ts.instant(PortalResources.pricing_windowsContainers),
          level: BannerMessageLevel.INFO,
          infoLink: 'https://go.microsoft.com/fwlink/?linkid=2009013',
        };
      }
    }

    // NOTE(michinoy): The OS type determines whether standard small plan is recommended or additional pricing tier.
    if ((input.specPickerInput.data && input.specPickerInput.data.isLinux) || ArmUtil.isLinuxApp(input.plan)) {
      this.additionalSpecs.unshift(new StandardSmallPlanPriceSpec(this.injector));
    } else {
      this.recommendedSpecs.unshift(new StandardSmallPlanPriceSpec(this.injector));
    }
  }
}

export class IsolatedSpecGroup extends PriceSpecGroup {
  recommendedSpecs = [
    new IsolatedSmallPlanPriceSpec(this.injector),
    new IsolatedMediumPlanPriceSpec(this.injector),
    new IsolatedLargePlanPriceSpec(this.injector),
  ];

  additionalSpecs = [];

  selectedSpec = null;
  iconUrl = 'image/app-service-environment.svg';
  title = this.ts.instant(PortalResources.pricing_isolatedTitle);
  id = PriceSpecGroupType.ISOLATED;
  description = this.ts.instant(PortalResources.pricing_isolatedDesc);
  emptyMessage = this.ts.instant(PortalResources.pricing_emptyIsolatedGroup);
  emptyInfoLink = Links.appServicePricing;

  constructor(injector: Injector, specManager: PlanPriceSpecManager) {
    super(injector, specManager);
  }

  initialize(input: PriceSpecInput) {}
}
