import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { MainStack } from '../stacks/MainStack';

export class RegistrationStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new MainStack(this, 'prjoectM',{
      env: props?.env, 
    });

  }
}