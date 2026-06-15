import * as React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement> & { title?: string };

export function createIconComponent(
  displayName: string,
  defaultTitle: string,
  render: (
    props: Required<Pick<IconProps, 'title'>> & Omit<IconProps, 'title'>,
  ) => React.ReactElement,
) {
  const Component = React.memo<IconProps>(({ title = defaultTitle, ...props }) =>
    render({ ...props, title }),
  );
  Component.displayName = displayName;
  return Component;
}
