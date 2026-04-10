/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Craft API URL - Full URL to the Craft API, including /api/v1 suffix */
  "craftUrl": string,
  /** Craft API Key - Bearer token starting with pdk_ */
  "craftKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
  /** Preferences accessible in the `daily` command */
  export type Daily = ExtensionPreferences & {}
  /** Preferences accessible in the `add-task` command */
  export type AddTask = ExtensionPreferences & {}
  /** Preferences accessible in the `append-daily` command */
  export type AppendDaily = ExtensionPreferences & {}
  /** Preferences accessible in the `recent` command */
  export type Recent = ExtensionPreferences & {}
  /** Preferences accessible in the `fuzzy-open` command */
  export type FuzzyOpen = ExtensionPreferences & {}
  /** Preferences accessible in the `daily-notes` command */
  export type DailyNotes = ExtensionPreferences & {}
  /** Preferences accessible in the `tasks` command */
  export type Tasks = ExtensionPreferences & {}
  /** Preferences accessible in the `create-document` command */
  export type CreateDocument = ExtensionPreferences & {}
  /** Preferences accessible in the `folders` command */
  export type Folders = ExtensionPreferences & {}
  /** Preferences accessible in the `collections` command */
  export type Collections = ExtensionPreferences & {}
  /** Preferences accessible in the `whoami` command */
  export type Whoami = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `daily` command */
  export type Daily = {
  /** today|yesterday|YYYY-MM-DD */
  "date": string
}
  /** Arguments passed to the `add-task` command */
  export type AddTask = {
  /** call the accountant */
  "task": string
}
  /** Arguments passed to the `append-daily` command */
  export type AppendDaily = {
  /** 15:42 thought */
  "text": string
}
  /** Arguments passed to the `recent` command */
  export type Recent = {}
  /** Arguments passed to the `fuzzy-open` command */
  export type FuzzyOpen = {}
  /** Arguments passed to the `daily-notes` command */
  export type DailyNotes = {}
  /** Arguments passed to the `tasks` command */
  export type Tasks = {}
  /** Arguments passed to the `create-document` command */
  export type CreateDocument = {
  /** Document title */
  "title": string
}
  /** Arguments passed to the `folders` command */
  export type Folders = {}
  /** Arguments passed to the `collections` command */
  export type Collections = {}
  /** Arguments passed to the `whoami` command */
  export type Whoami = {}
}

