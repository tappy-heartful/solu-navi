"use client";

import React from "react";
import styles from "./ListGroupContainer.module.css";

type Props = {
  title: string;
  icon?: string;
  children: React.ReactNode;
  containerStyle?: React.CSSProperties;
  titleStyle?: React.CSSProperties;
};

export const ListGroupContainer = ({
  title,
  icon,
  children,
  containerStyle,
  titleStyle,
}: Props) => {
  return (
    <div className={styles.container} style={containerStyle}>
      <h2 className={styles.title} style={titleStyle}>
        {icon && <i className={`${icon} ${styles.icon}`} />}
        <span>{title}</span>
      </h2>
      <div className={styles.tableArea}>{children}</div>
    </div>
  );
};
