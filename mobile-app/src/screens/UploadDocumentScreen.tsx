// ============================================================================
// DEVELOPMENT BRANCH: this feature is switched off for testing.
// Not in FOR_TESTING scope (Account > Upload Document). Uncomment the whole file to bring it back
// (and the matching lines marked "DEV BRANCH" in RootNavigator.tsx / types.ts).
// ============================================================================
// import React, { useState } from 'react';
// import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
// import AccountLayout from '../components/AccountLayout';
// import TextField from '../components/TextField';
// import Button from '../components/Button';
// import SelectModal from '../components/SelectModal';
// import UploadBox from '../components/UploadBox';
// import { PendingReviewModal } from '../components/AccountModals';
// import { IconCloseFilled, IconDocumentLarge } from '../components/AccountIcons';
// import { Svg } from '../assets';
// import { useAuth } from '../context/AuthContext';
// import { pickDocument, uploadUserFile, type PickedFile } from '../services/storageService';
// import { replaceIdentityDocument } from '../services/userService';
// import { friendlyError } from '../services/errors';
// import { colors, fonts, text } from '../theme';
// import type { ScreenProps } from '../navigation/types';
//
// /** Same documents the sign-up "Verify Your Identity" step accepts. */
// export const DOCUMENT_TYPES = ['Student Pass', 'Identity Card (IC)'] as const;
//
// /** Figma "Upload Document" (240:333) and the "Document Uploaded!" popup (240:425). */
// export default function UploadDocumentScreen({ navigation }: ScreenProps<'UploadDocument'>) {
//   const { user, profile } = useAuth();
//   const [type, setType] = useState(profile?.identityDocument?.label ?? '');
//   const [file, setFile] = useState<PickedFile | null>(null);
//   const [errors, setErrors] = useState<{ type?: string | null; file?: string | null; form?: string | null }>({});
//   const [selectOpen, setSelectOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [done, setDone] = useState(false);
//
//   const browse = async () => {
//     try {
//       const picked = await pickDocument();
//       if (picked) {
//         setFile(picked);
//         setErrors((e) => ({ ...e, file: null, form: null }));
//       }
//     } catch (e) {
//       setErrors((x) => ({ ...x, file: e instanceof Error ? e.message : friendlyError(e) }));
//     }
//   };
//
//   const onSubmit = async () => {
//     const next = {
//       type: type ? null : 'Please select the document type.',
//       file: file ? null : 'Please upload your document.',
//     };
//     setErrors(next);
//     if (next.type || next.file || !user || !file) return;
//     setLoading(true);
//     try {
//       const stored = await uploadUserFile(user.uid, 'identity', file);
//       await replaceIdentityDocument(user.uid, stored, type);
//       setDone(true);
//     } catch (e) {
//       setErrors({ form: friendlyError(e, 'Upload failed. Please check your connection and try again.') });
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const isImage = !!file?.mimeType.startsWith('image/');
//
//   return (
//     <AccountLayout
//       title="Upload Document"
//       onBack={() => navigation.goBack()}
//       contentTop={28}
//       footer={
//         <View style={styles.footer}>
//           {errors.form ? <Text style={[text.fieldError, styles.center]}>{errors.form}</Text> : null}
//           <Button title="Submit" onPress={onSubmit} loading={loading} />
//         </View>
//       }
//     >
//       <View style={styles.body}>
//         <TextField
//           label="Document Type"
//           placeholder="Select"
//           value={type}
//           onPressField={() => setSelectOpen(true)}
//           right={<Svg.IconChevronDown />}
//           error={errors.type}
//         />
//
//         <View style={styles.upload}>
//           <Text style={text.label}>
//             Upload Document <Text style={styles.side}>(Front Side)</Text>
//           </Text>
//           <UploadBox value={null} onPress={browse} error={errors.file} loading={loading} />
//         </View>
//
//         {file ? (
//           <View style={styles.thumbWrap}>
//             {isImage ? (
//               <Image source={{ uri: file.uri }} style={styles.thumb} resizeMode="cover" />
//             ) : (
//               <View style={[styles.thumb, styles.fileThumb]}>
//                 <IconDocumentLarge size={26} />
//                 <Text style={styles.fileName} numberOfLines={1}>
//                   {file.name}
//                 </Text>
//               </View>
//             )}
//             <Pressable
//               onPress={() => setFile(null)}
//               hitSlop={10}
//               style={styles.remove}
//               accessibilityRole="button"
//               accessibilityLabel="Remove file"
//             >
//               <IconCloseFilled />
//             </Pressable>
//           </View>
//         ) : null}
//       </View>
//
//       <SelectModal
//         visible={selectOpen}
//         title="Document Type"
//         options={DOCUMENT_TYPES}
//         value={type || null}
//         onClose={() => setSelectOpen(false)}
//         onSelect={(v) => {
//           setType(v);
//           setErrors((e) => ({ ...e, type: null }));
//           setSelectOpen(false);
//         }}
//       />
//       <PendingReviewModal
//         visible={done}
//         title="Document Uploaded!"
//         message="Your document is under review. Verification may take 1–2 business days."
//         onHome={() => {
//           setDone(false);
//           navigation.navigate('Home');
//         }}
//       />
//     </AccountLayout>
//   );
// }
//
// const styles = StyleSheet.create({
//   body: { gap: 22 },
//   upload: { gap: 12 },
//   side: { fontFamily: fonts.regular, color: colors.grey },
//   thumbWrap: { width: 106, height: 69 },
//   thumb: { width: 106, height: 69, borderRadius: 14, backgroundColor: colors.greyBg },
//   fileThumb: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
//   fileName: { fontFamily: fonts.medium, fontSize: 10, color: colors.grey, maxWidth: 94 },
//   remove: { position: 'absolute', top: 5, right: 6 },
//   footer: { gap: 12 },
//   center: { textAlign: 'center' },
// });

export {};
